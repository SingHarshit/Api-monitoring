const { Worker } = require('bullmq')
const redis = require('../config/redis')
const { investigateRca } = require('../services/aiService')
const { RCA_QUEUE_NAME } = require('../queues/rcaQueue')
const {
  markRcaRunning,
  saveRcaResult,
  markRcaFailed,
} = require('../services/rcaReportService')

const rcaWorker = new Worker(
  RCA_QUEUE_NAME,
  async (job) => {
    const {
      incidentId,
      monitorId,
      checkId,
      triggeredAt,
      windowHours,
      maxIterations,
      initialSignals,
      requestId,
    } = job.data

    if (!incidentId || !monitorId || !checkId || !triggeredAt) {
      throw new Error(
        'incidentId, monitorId, checkId, and triggeredAt are required'
      )
    }

    await markRcaRunning(incidentId)

    try {
      const result = await investigateRca(
        {
          incidentId,
          monitorId,
          checkId,
          triggeredAt,
          windowHours: windowHours || 1,
          maxIterations: maxIterations || 3,
          initialSignals: initialSignals || [],
        },
        {
          requestId: requestId || `rca-job-${job.id}`,
        }
      )

      const savedReport = await saveRcaResult({
        incidentId,
        result,
      })

      return {
        incidentId,
        monitorId,
        checkId,
        result,
        savedReportId: savedReport.id,
      }
    } catch (error) {
      await markRcaFailed({
        incidentId,
        error,
      })

      throw error
    }
  },
  {
    connection: redis.options,
    concurrency: Number(
      process.env.RCA_WORKER_CONCURRENCY || 1
    ),
  }
)

rcaWorker.on('completed', (job) => {
  console.log(`RCA job ${job.id} completed`)
})

rcaWorker.on('failed', (job, error) => {
  console.error(
    `RCA job ${job?.id} failed:`,
    error.message
  )
})

module.exports = rcaWorker