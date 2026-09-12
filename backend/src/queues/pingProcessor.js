const { Worker } = require('bullmq')
const axios = require('axios')
const redis = require('../config/redis')
const prisma = require('../config/prisma')
const aiQueue = require('./aiQueue')
const { emitMonitorStatus, emitWorkspaceStatus } = require('../socket/statusGateway')

const worker = new Worker(
  'ping-queue',
  async (job) => {
    const { monitorId, url, method = 'GET', timeoutMs = 5000 } = job.data

    const startedAt = Date.now()

    try {
      const response = await axios({
        url,
        method,
        timeout: timeoutMs,
        validateStatus: () => true,
      })

      const latencyMs = Date.now() - startedAt
      const isUp = response.status >= 200 && response.status < 400

      const headersJson =
        typeof response.headers?.toJSON === 'function'
          ? response.headers.toJSON()
          : { ...(response.headers || {}) }

      const check = await prisma.monitorCheck.create({
        data: {
          monitorId,
          status: isUp ? 'SUCCESS' : 'FAILED',
          latencyMs,
          httpStatusCode: response.status,
          responseTimeMs: latencyMs,
          responseMeta: {
            headers: headersJson,
          },
        },
      })

      const monitor = await prisma.monitor.update({
        where: { id: monitorId },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: isUp ? 'SUCCESS' : 'FAILED',
          lastLatencyMs: latencyMs,
          consecutiveFails: isUp ? 0 : { increment: 1 },
          status: isUp ? 'UP' : 'DOWN',
        },
        select: {
          id: true,
          workspaceId: true,
          status: true,
          lastCheckedAt: true,
          lastStatus: true,
          lastLatencyMs: true,
          consecutiveFails: true,
          uptimePercent: true,
          name: true,
        },
      })

      const payload = {
        monitorId: monitor.id,
        workspaceId: monitor.workspaceId,
        status: monitor.status,
        lastCheckedAt: monitor.lastCheckedAt,
        lastStatus: monitor.lastStatus,
        lastLatencyMs: monitor.lastLatencyMs,
        consecutiveFails: monitor.consecutiveFails,
        uptimePercent: monitor.uptimePercent,
        checkId: check.id,
      }

      emitMonitorStatus(monitor.id, payload)
      emitWorkspaceStatus(monitor.workspaceId, payload)

      await enqueueAiAnalysis(monitorId, check.id)

      return {
        monitorId,
        status: isUp ? 'UP' : 'DOWN',
        latencyMs,
        httpStatusCode: response.status,
      }
    } catch (error) {
      const latencyMs = Date.now() - startedAt
      const isNetworkError = Boolean(error?.isAxiosError)

      if (isNetworkError) {
        const monitor = await prisma.monitor.update({
          where: { id: monitorId },
          data: {
            lastCheckedAt: new Date(),
            lastStatus: 'TIMEOUT',
            lastLatencyMs: latencyMs,
            consecutiveFails: { increment: 1 },
            status: 'DOWN',
          },
          select: {
            id: true,
            workspaceId: true,
            status: true,
            lastCheckedAt: true,
            lastStatus: true,
            lastLatencyMs: true,
            consecutiveFails: true,
            uptimePercent: true,
          },
        })

        const check = await prisma.monitorCheck.create({
          data: {
            monitorId,
            status: 'TIMEOUT',
            latencyMs,
            errorMessage: error.message,
          },
        })

        const payload = {
          monitorId: monitor.id,
          workspaceId: monitor.workspaceId,
          status: monitor.status,
          lastCheckedAt: monitor.lastCheckedAt,
          lastStatus: monitor.lastStatus,
          lastLatencyMs: monitor.lastLatencyMs,
          consecutiveFails: monitor.consecutiveFails,
          uptimePercent: monitor.uptimePercent,
          checkId: check.id,
        }

        emitMonitorStatus(monitor.id, payload)
        emitWorkspaceStatus(monitor.workspaceId, payload)

        await enqueueAiAnalysis(monitorId, check.id)
      }

      throw error
    }
  },
  {
    connection: redis.options,
    concurrency: 5,
  }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message)
  console.error(error.stack)
})

module.exports = worker

const AI_ANALYSIS_WINDOW_HOURS = Number(
  process.env.AI_ANALYSIS_WINDOW_HOURS || 24
)

async function enqueueAiAnalysis(monitorId, checkId) {
  const windowStart = new Date(
    Date.now() - AI_ANALYSIS_WINDOW_HOURS * 60 * 60 * 1000
  )

  const [monitor, checks, incidents] = await Promise.all([
    prisma.monitor.findUnique({
      where: { id: monitorId },
      select: {
        id: true,
        name: true,
        url: true,
        method: true,
        timeoutMs: true,
      },
    }),

    prisma.monitorCheck.findMany({
      where: {
        monitorId,
        checkedAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        checkedAt: 'asc',
      },
      take: 500,
      select: {
        id: true,
        checkedAt: true,
        status: true,
        latencyMs: true,
        httpStatusCode: true,
        responseTimeMs: true,
        errorMessage: true,
        region: true,
      },
    }),

    prisma.incident.findMany({
      where: {
        monitorId,
        startedAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        startedAt: 'asc',
      },
      select: {
        id: true,
        status: true,
        title: true,
        reason: true,
        startedAt: true,
        resolvedAt: true,
      },
    }),
  ])

  if (!monitor) {
    throw new Error(`Monitor ${monitorId} not found`)
  }

  await aiQueue.add(
    'analyze-monitor',
    {
      monitorId,
      checkId,
      windowHours: AI_ANALYSIS_WINDOW_HOURS,
      triggeredAt: new Date().toISOString(),
      payload: {
        monitor_id: monitor.id,
        analysis_window: {
          from: windowStart.toISOString(),
          to: new Date().toISOString(),
          hours: AI_ANALYSIS_WINDOW_HOURS,
        },
        monitor: {
          name: monitor.name,
          url: monitor.url,
          method: monitor.method,
          timeout_ms: monitor.timeoutMs,
        },
        checks,
        incidents,
      },
    },
    {
      jobId: `ai-analysis-${monitorId}-${checkId}`,
    }
  )
}