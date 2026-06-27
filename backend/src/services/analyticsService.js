const prisma = require('../config/prisma')

function normalizeHours(value, fallback = 24) {
  if (value === undefined || value === null || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback

  return Math.min(Math.max(Math.floor(parsed), 1), 720)
}

function getWindowStart(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

function buildEmptyBuckets(hours, startTime) {
  const buckets = []

  for (let index = 0; index < hours; index += 1) {
    const bucketStart = new Date(startTime.getTime() + index * 60 * 60 * 1000)
    const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000)

    buckets.push({
      bucketStart: bucketStart.toISOString(),
      bucketEnd: bucketEnd.toISOString(),
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      timeoutChecks: 0,
      averageLatencyMs: null,
    })
  }

  return buckets
}

function summarizeChecks(checks) {
  const totalChecks = checks.length
  const successfulChecks = checks.filter((check) => check.status === 'SUCCESS').length
  const failedChecks = checks.filter((check) => check.status === 'FAILED').length
  const timeoutChecks = checks.filter((check) => check.status === 'TIMEOUT').length

  const successRatePercent = totalChecks > 0 ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : 0
  const uptimePercent = successRatePercent
  const downtimePercent = totalChecks > 0 ? Number((100 - successRatePercent).toFixed(2)) : 0

  return {
    totalChecks,
    successfulChecks,
    failedChecks,
    timeoutChecks,
    successRatePercent,
    uptimePercent,
    downtimePercent,
  }
}

async function getChecksInWindow(monitorId, hours) {
  const startedAt = getWindowStart(hours)

  return prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: startedAt,
      },
    },
    orderBy: {
      checkedAt: 'asc',
    },
    select: {
      status: true,
      latencyMs: true,
      checkedAt: true,
    },
  })
}

async function getUptimeAnalytics(monitorId, hours = 24) {
  const windowHours = normalizeHours(hours, 24)
  const checks = await getChecksInWindow(monitorId, windowHours)
  const summary = summarizeChecks(checks)

  return {
    monitorId,
    windowHours,
    ...summary,
  }
}

async function getLatencyAnalytics(monitorId, hours = 24) {
  const windowHours = normalizeHours(hours, 24)
  const startedAt = getWindowStart(windowHours)

  const checks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: startedAt,
      },
      status: 'SUCCESS',
      latencyMs: {
        not: null,
      },
    },
    orderBy: {
      checkedAt: 'asc',
    },
    select: {
      latencyMs: true,
    },
  })

  const latencies = checks.map((check) => check.latencyMs).filter((value) => typeof value === 'number')

  const sampleSize = latencies.length
  const averageLatencyMs =
    sampleSize > 0 ? Number((latencies.reduce((sum, value) => sum + value, 0) / sampleSize).toFixed(2)) : null
  const minLatencyMs = sampleSize > 0 ? Math.min(...latencies) : null
  const maxLatencyMs = sampleSize > 0 ? Math.max(...latencies) : null

  return {
    monitorId,
    windowHours,
    sampleSize,
    averageLatencyMs,
    minLatencyMs,
    maxLatencyMs,
  }
}

async function getHistoryAnalytics(monitorId, hours = 24) {
  const windowHours = normalizeHours(hours, 24)
  const startedAt = getWindowStart(windowHours)
  const checks = await getChecksInWindow(monitorId, windowHours)

  const buckets = buildEmptyBuckets(windowHours, startedAt)
  const startTime = startedAt.getTime()

  for (const check of checks) {
    const bucketIndex = Math.floor((new Date(check.checkedAt).getTime() - startTime) / (60 * 60 * 1000))
    if (bucketIndex < 0 || bucketIndex >= buckets.length) continue

    const bucket = buckets[bucketIndex]
    bucket.totalChecks += 1

    if (check.status === 'SUCCESS') {
      bucket.successfulChecks += 1
    } else if (check.status === 'FAILED') {
      bucket.failedChecks += 1
    } else if (check.status === 'TIMEOUT') {
      bucket.timeoutChecks += 1
    }
  }

  for (const bucket of buckets) {
    const total = bucket.totalChecks
    bucket.successRatePercent =
      total > 0 ? Number(((bucket.successfulChecks / total) * 100).toFixed(2)) : 0
    bucket.uptimePercent = bucket.successRatePercent
    bucket.downtimePercent = total > 0 ? Number((100 - bucket.successRatePercent).toFixed(2)) : 0
  }

  return {
    monitorId,
    windowHours,
    from: startedAt.toISOString(),
    to: new Date().toISOString(),
    data: buckets,
  }
}

async function getSuccessRateAnalytics(monitorId, hours = 24) {
  const windowHours = normalizeHours(hours, 24)
  const checks = await getChecksInWindow(monitorId, windowHours)
  const summary = summarizeChecks(checks)

  return {
    monitorId,
    windowHours,
    totalChecks: summary.totalChecks,
    successfulChecks: summary.successfulChecks,
    failedChecks: summary.failedChecks,
    timeoutChecks: summary.timeoutChecks,
    successRatePercent: summary.successRatePercent,
  }
}

module.exports = {
  normalizeHours,
  getUptimeAnalytics,
  getLatencyAnalytics,
  getHistoryAnalytics,
  getSuccessRateAnalytics,
}
