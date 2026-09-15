const { Worker } = require('bullmq')
const redis = require('../config/redis')
const { analyzeMonitor } = require('../services/aiService')
const {
  aggregateAnomalyResult,
} = require('../services/incidentAggregator')

const {
  enqueueIncidentLifecycle,
  enqueueRca,
} = require('./incidentLifecycle')

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

    const aggregation = await aggregateAnomalyResult({
      monitorId,
      checkId,
      triggeredAt,
      result,
    })

    await enqueueIncidentLifecycle({
      monitorId,
      checkId,
      analysisIsAnomaly: result?.analysis?.isAnomaly === true,
    })

    let rcaJob = null

    if (aggregation?.incident?.id) {
      rcaJob = await enqueueRca({
        incidentId: aggregation.incident.id,
        monitorId,
        checkId,
        triggeredAt,
        windowHours,
        maxIterations: 3,
        initialSignals: result?.analysis?.signals || [],
        requestId: requestId || `rca-job-${job.id}`,
      })
    }

    return {
      monitorId,
      checkId,
      result,
      aggregation,
      rcaJobId: rcaJob?.id || null,
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