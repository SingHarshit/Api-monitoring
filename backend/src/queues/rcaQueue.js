const { Queue } = require('bullmq')
const redis = require('../config/redis')

const RCA_QUEUE_NAME = 'rca-investigation-queue'

const rcaQueue = new Queue(RCA_QUEUE_NAME, {
  connection: redis.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
})

async function enqueueRca(data) {
  const {
    incidentId,
    monitorId,
    checkId,
    triggeredAt,
    windowHours = 1,
    maxIterations = 3,
    initialSignals = [],
    requestId,
  } = data

  if (!incidentId) {
    throw new Error('incidentId is required')
  }

  if (!monitorId) {
    throw new Error('monitorId is required')
  }

  if (!checkId) {
    throw new Error('checkId is required')
  }

  if (!triggeredAt) {
    throw new Error('triggeredAt is required')
  }

  return rcaQueue.add(
    'investigate-root-cause',
    {
      incidentId,
      monitorId,
      checkId,
      triggeredAt,
      windowHours,
      maxIterations,
      initialSignals,
      requestId,
    },
    {
      jobId: `rca-${incidentId}-${checkId}`,
    }
  )
}

module.exports = {
  RCA_QUEUE_NAME,
  rcaQueue,
  enqueueRca,
}