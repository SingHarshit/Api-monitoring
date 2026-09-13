const { Queue } = require('bullmq')
const redis = require('../config/redis')

const incidentLifecycleQueue = new Queue(
  'incident-lifecycle-queue',
  {
    connection: redis.options,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    },
  }
)

async function enqueueIncidentLifecycle(data) {
  const {
    monitorId,
    checkId,
    analysisIsAnomaly,
  } = data

  return incidentLifecycleQueue.add(
    'process-incident-lifecycle',
    {
      monitorId,
      checkId,
      analysisIsAnomaly,
    },
    {
      jobId: `incident-lifecycle-${monitorId}-${checkId}`,
    }
  )
}

module.exports = {
  incidentLifecycleQueue,
  enqueueIncidentLifecycle,
}