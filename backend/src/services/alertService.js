// backend/src/services/alertService.js
const redis = require('../config/redis')
const { sendEmail } = require('./emailService')
const { sendSlackAlert } = require('../workers/slack.worker')
const { sendDiscordAlert } = require('../workers/discord.worker')

const FAILURE_THRESHOLD = Number(process.env.AUTH_FAILURE_ALERT_THRESHOLD || 3)
const FAILURE_WINDOW_SECONDS = Number(process.env.AUTH_FAILURE_WINDOW_SECONDS || 900)
const SLOW_RESPONSE_MS = Number(process.env.AUTH_SLOW_RESPONSE_MS || 5000)

function normalizeEmail(email) {
  return String(email || 'unknown').trim().toLowerCase()
}

function failureKey(email) {
  return `auth:failures:${normalizeEmail(email)}`
}

function buildMessage({
  email,
  statusCode,
  latencyMs,
  consecutiveFailures,
  reason,
  path,
  ip,
  userAgent,
}) {
  const severity = consecutiveFailures >= FAILURE_THRESHOLD ? 'CRITICAL' : 'WARNING'

  return [
    `[${severity}] Auth alert`,
    `Email: ${normalizeEmail(email)}`,
    `Path: ${path || '/api/auth/login'}`,
    `Status: ${statusCode}`,
    `Latency: ${latencyMs}ms`,
    `Consecutive failures: ${consecutiveFailures}`,
    `Reason: ${reason || 'N/A'}`,
    `IP: ${ip || 'N/A'}`,
    `User-Agent: ${userAgent || 'N/A'}`,
  ].join('\n')
}

async function recordAuthAttempt({
  email,
  statusCode,
  latencyMs,
  reason,
  path,
  ip,
  userAgent,
}) {
  const normalizedEmail = normalizeEmail(email)
  let consecutiveFailures = 0

  if (statusCode === 200) {
    await redis.del(failureKey(normalizedEmail))
  } else {
    consecutiveFailures = await redis.incr(failureKey(normalizedEmail))

    if (consecutiveFailures === 1) {
      await redis.expire(failureKey(normalizedEmail), FAILURE_WINDOW_SECONDS)
    }
  }

  const slowResponse = latencyMs > SLOW_RESPONSE_MS
  const thresholdHit = consecutiveFailures >= FAILURE_THRESHOLD

  if (!slowResponse && !thresholdHit) {
    return { alerted: false, consecutiveFailures }
  }

  const message = buildMessage({
    email: normalizedEmail,
    statusCode,
    latencyMs,
    consecutiveFailures,
    reason,
    path,
    ip,
    userAgent,
  })

  const alertEmail = process.env.ALERT_EMAIL_TO || process.env.SMTP_USER
  const tasks = []

  if (alertEmail) {
    tasks.push(
      sendEmail({
        to: alertEmail,
        subject: thresholdHit
          ? `CRITICAL auth failure alert for ${normalizedEmail}`
          : `Slow auth response for ${normalizedEmail}`,
        text: message,
      })
    )
  }

  tasks.push(sendSlackAlert(message))
  tasks.push(sendDiscordAlert(message))

  await Promise.allSettled(tasks)

  return { alerted: true, consecutiveFailures }
}

module.exports = {
  recordAuthAttempt,
}