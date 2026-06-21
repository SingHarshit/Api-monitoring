const { Worker } = require('bullmq')
const axios = require('axios')
const redis = require('../config/redis')
const pingQueue = require('../queues/pingQueue')
const prisma = require('../config/prisma')

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

      await prisma.monitorCheck.create({
        data: {
          monitorId,
          status: isUp ? 'SUCCESS' : 'FAILED',
          latencyMs,
          httpStatusCode: response.status,
          responseTimeMs: latencyMs,
          responseMeta: {
            headers: response.headers,
          },
        },
      })

      await prisma.monitor.update({
        where: { id: monitorId },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: isUp ? 'SUCCESS' : 'FAILED',
          lastLatencyMs: latencyMs,
          consecutiveFails: isUp ? 0 : { increment: 1 },
          status: isUp ? 'UP' : 'DOWN',
        },
      })

      return {
        monitorId,
        status: isUp ? 'UP' : 'DOWN',
        latencyMs,
        httpStatusCode: response.status,
      }
    } catch (error) {
      const latencyMs = Date.now() - startedAt

      await prisma.monitorCheck.create({
        data: {
          monitorId,
          status: 'TIMEOUT',
          latencyMs,
          errorMessage: error.message,
        },
      })

      await prisma.monitor.update({
        where: { id: monitorId },
        data: {
          lastCheckedAt: new Date(),
          lastStatus: 'TIMEOUT',
          lastLatencyMs: latencyMs,
          consecutiveFails: { increment: 1 },
          status: 'DOWN',
        },
      })

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
})

module.exports = worker