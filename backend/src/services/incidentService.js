const prisma = require('../config/prisma')
const {
  emitMonitorIncident,
  emitWorkspaceIncident,
} = require('../socket/statusGateway')
const { enqueueManualRca } = require('../queues/rcaQueue')

const INCIDENT_INCLUDE = {
  anomalyEvents: {
    orderBy: {
      detectedAt: 'asc',
    },
  },
  rcaReport: true,
}

const VALID_STATUSES = new Set([
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
])

function createServiceError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function findAuthorizedMonitor(monitorId, userId) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      workspace: {
        OR: [
          {
            ownerId: userId,
          },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
    },
    select: {
      id: true,
      workspaceId: true,
    },
  })

  if (!monitor) {
    throw createServiceError('Monitor not found', 404)
  }

  return monitor
}

async function listIncidents({
  monitorId,
  userId,
  status,
}) {
  await findAuthorizedMonitor(monitorId, userId)

  const where = {
    monitorId,
  }

  if (status) {
    if (!VALID_STATUSES.has(status)) {
      throw createServiceError('Invalid incident status', 400)
    }

    where.status = status
  }

  return prisma.incident.findMany({
    where,
    orderBy: {
      startedAt: 'desc',
    },
    include: INCIDENT_INCLUDE,
  })
}

async function getIncident({
  monitorId,
  incidentId,
  userId,
}) {
  await findAuthorizedMonitor(monitorId, userId)

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      monitorId,
    },
    include: INCIDENT_INCLUDE,
  })

  if (!incident) {
    throw createServiceError('Incident not found', 404)
  }

  return incident
}

async function updateIncidentStatus({
  monitorId,
  incidentId,
  userId,
  status,
}) {
  if (!VALID_STATUSES.has(status)) {
    throw createServiceError('Invalid incident status', 400)
  }

  const monitor = await findAuthorizedMonitor(monitorId, userId)

  const existingIncident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      monitorId,
    },
  })

  if (!existingIncident) {
    throw createServiceError('Incident not found', 404)
  }

  const now = new Date()

  const data = {
    status,
  }

  if (status === 'OPEN') {
    data.acknowledgedAt = null
    data.resolvedAt = null
  }

  if (status === 'ACKNOWLEDGED') {
    data.acknowledgedAt = existingIncident.acknowledgedAt || now
    data.resolvedAt = null
  }

  if (status === 'RESOLVED') {
    data.resolvedAt = existingIncident.resolvedAt || now
  }

  const incident = await prisma.incident.update({
    where: {
      id: incidentId,
    },
    data,
    include: INCIDENT_INCLUDE,
  })

  const payload = {
    incident,
    monitorId,
    workspaceId: monitor.workspaceId,
  }

  emitMonitorIncident(monitorId, payload)
  emitWorkspaceIncident(monitor.workspaceId, payload)

  return incident
}

async function enqueueIncidentRca({
  monitorId,
  incidentId,
  userId,
  windowHours,
  maxIterations,
  requestId,
}) {
  await findAuthorizedMonitor(monitorId, userId)

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      monitorId,
    },
  })

  if (!incident) {
    throw createServiceError('Incident not found', 404)
  }

  const job = await enqueueManualRca({
    incidentId,
    windowHours,
    maxIterations,
    requestId,
  })

  return {
    incidentId,
    jobId: job.id,
    status: 'QUEUED',
  }
}

async function getIncidentRca({
  monitorId,
  incidentId,
  userId,
}) {
  await findAuthorizedMonitor(monitorId, userId)

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      monitorId,
    },
    include: {
      rcaReport: true,
    },
  })

  if (!incident) {
    throw createServiceError('Incident not found', 404)
  }

  return incident.rcaReport
}

module.exports = {
  listIncidents,
  getIncident,
  updateIncidentStatus,
  enqueueIncidentRca,
  getIncidentRca,
}