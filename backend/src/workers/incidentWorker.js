const { Worker } = require('bullmq')
const redis = require('../config/redis')
const {
  resolveRecoveredIncidents,
} = require('../services/incidentLifecycle')

const INCIDENT_LIFECYCLE_QUEUE = 'incident-lifecycle-queue'

const incidentWorker = new Worker(
  INCIDENT_LIFECYCLE_QUEUE,
  async (job) => {
    const {
      monitorId,
      checkId,
      analysisIsAnomaly,
    } = job.data

    if (!monitorId || !checkId) {
      throw new Error(
        'monitorId and checkId are required'
      )
    }

    return resolveRecoveredIncidents({
      monitorId,
      checkId,
      analysisIsAnomaly,
    })
  },
  {
    connection: redis.options,
    concurrency: Number(
      process.env.INCIDENT_WORKER_CONCURRENCY || 2
    ),
  }
)

incidentWorker.on('completed', (job) => {
  console.log(`Incident lifecycle job ${job.id} completed`)
})

incidentWorker.on('failed', (job, error) => {
  console.error(
    `Incident lifecycle job ${job?.id} failed:`,
    error.message
  )
})

module.exports = incidentWorker