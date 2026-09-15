const { Queue } = require('bullmq')
const redis = require('../config/redis')
const prisma = require('../config/prisma')

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

  if (!incidentId || !monitorId || !checkId || !triggeredAt) {
    throw new Error(
      'incidentId, monitorId, checkId, and triggeredAt are required'
    )
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

async function enqueueManualRca({
  incidentId,
  windowHours = 1,
  maxIterations = 3,
  requestId,
}) {
  const incident = await prisma.incident.findUnique({
    where: {
      id: incidentId,
    },
    include: {
      anomalyEvents: {
        orderBy: {
          detectedAt: 'asc',
        },
      },
    },
  })

  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`)
  }

  const latestEvent = [...incident.anomalyEvents]
    .reverse()
    .find((event) => event.checkId)

  if (!latestEvent?.checkId) {
    throw new Error(
      `Incident ${incidentId} has no monitor check for RCA`
    )
  }

  const initialSignals = incident.anomalyEvents.map((event) => ({
    type: event.type,
    severity: event.severity,
    details: event.details || {},
    detectedAt: event.detectedAt,
  }))

  return enqueueRca({
    incidentId,
    monitorId: incident.monitorId,
    checkId: latestEvent.checkId,
    triggeredAt: incident.lastEventAt || incident.startedAt,
    windowHours,
    maxIterations,
    initialSignals,
    requestId,
  })
}

module.exports = {
  RCA_QUEUE_NAME,
  rcaQueue,
  enqueueRca,
  enqueueManualRca,
}