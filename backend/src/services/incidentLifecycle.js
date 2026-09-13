const prisma = require('../config/prisma')
const {
  emitMonitorIncident,
  emitWorkspaceIncident,
} = require('../socket/statusGateway')

const HEALTHY_CHECK_COUNT = Number(
  process.env.INCIDENT_HEALTHY_CHECK_COUNT || 3
)

async function resolveRecoveredIncidents({
  monitorId,
  checkId,
  analysisIsAnomaly,
}) {
  if (!monitorId || !checkId) {
    throw new Error('monitorId and checkId are required')
  }

  // An anomaly result must never resolve an existing incident.
  if (analysisIsAnomaly !== false) {
    return {
      resolved: false,
      reason: 'CURRENT_CHECK_IS_ANOMALOUS',
      incidents: [],
    }
  }

  const monitor = await prisma.monitor.findUnique({
    where: {
      id: monitorId,
    },
    select: {
      id: true,
      workspaceId: true,
    },
  })

  if (!monitor) {
    throw new Error(`Monitor ${monitorId} not found`)
  }

  const latestChecks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
    },
    orderBy: {
      checkedAt: 'desc',
    },
    take: HEALTHY_CHECK_COUNT,
    select: {
      id: true,
      status: true,
      checkedAt: true,
    },
  })

  if (latestChecks.length < HEALTHY_CHECK_COUNT) {
    return {
      resolved: false,
      reason: 'NOT_ENOUGH_HEALTHY_CHECKS',
      incidents: [],
    }
  }

  const allChecksHealthy = latestChecks.every(
    (check) => check.status === 'SUCCESS'
  )

  if (!allChecksHealthy) {
    return {
      resolved: false,
      reason: 'RECOVERY_SEQUENCE_NOT_COMPLETE',
      incidents: [],
    }
  }

  const incidents = await prisma.$transaction(async (transaction) => {
    const openIncidents = await transaction.incident.findMany({
      where: {
        monitorId,
        status: {
          in: ['OPEN', 'ACKNOWLEDGED'],
        },
      },
    })

    if (openIncidents.length === 0) {
      return []
    }

    const resolvedAt = new Date()

    return Promise.all(
      openIncidents.map((incident) =>
        transaction.incident.update({
          where: {
            id: incident.id,
          },
          data: {
            status: 'RESOLVED',
            resolvedAt,
          },
          include: {
            anomalyEvents: {
              orderBy: {
                detectedAt: 'asc',
              },
              include: {
                check: true,
              },
            },
          },
        })
      )
    )
  })

  for (const incident of incidents) {
    const payload = {
      type: 'INCIDENT_RESOLVED',
      incident,
      monitorId,
      workspaceId: monitor.workspaceId,
      resolvedBy: 'AUTOMATIC_RECOVERY',
      recoveryCheckId: checkId,
    }

    emitMonitorIncident(monitorId, payload)
    emitWorkspaceIncident(monitor.workspaceId, payload)
  }

  return {
    resolved: incidents.length > 0,
    reason: incidents.length > 0
      ? 'HEALTHY_CHECK_THRESHOLD_REACHED'
      : 'NO_OPEN_INCIDENTS',
    incidents,
  }
}

module.exports = {
  resolveRecoveredIncidents,
}