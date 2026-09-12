const { Worker } = require('bullmq')
const redis = require('../config/redis')
const { analyzeMonitor } = require('../services/aiService')

const worker = new Worker(
  'ai-analysis-queue',
  async (job) => {
    const {
      monitorId,
      checkId,
      windowHours,
      triggeredAt,
      payload,
      requestId,
    } = job.data

    if (!monitorId || !checkId || !windowHours || !triggeredAt || !payload) {
      throw new Error(
        'monitorId, checkId, windowHours, triggeredAt, and payload are required'
      )
    }

    const result = await analyzeMonitor(
      {
        monitorId,
        checkId,
        windowHours,
        triggeredAt,
        payload,
      },
      {
        requestId: requestId || `ai-job-${job.id}`,
      }
    )

    return {
      monitorId,
      checkId,
      result,
    }
  },
  {
    connection: redis.options,
    concurrency: Number(process.env.AI_WORKER_CONCURRENCY || 2),
  }
)

worker.on('completed', (job) => {
  console.log(`AI job ${job.id} completed`)
})

worker.on('failed', (job, error) => {
  console.error(`AI job ${job?.id} failed:`, error.message)
})

module.exports = worker