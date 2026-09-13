const prisma = require('../config/prisma')

const INCIDENT_GROUPING_MINUTES = Number(
  process.env.INCIDENT_GROUPING_MINUTES || 5
)

const SEVERITY_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

function normalizeDate(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return date
}

function getHighestSeverity(first, second) {
  return SEVERITY_RANK[second] > SEVERITY_RANK[first] ? second : first
}

function buildIncidentTitle(types) {
  const labels = {
    LATENCY: 'latency',
    ERROR_RATE: 'error rate',
    TIMEOUT: 'timeout',
    ISOLATION_FOREST: 'behavioral anomaly',
  }

  const uniqueLabels = [...new Set(types.map((type) => labels[type] || type))]

  return `${uniqueLabels.join(', ')} detected`
}

function getAnomalySignals(analysisResult) {
  const analysis = analysisResult?.analysis || analysisResult

  if (!analysis?.isAnomaly || !Array.isArray(analysis.signals)) {
    return []
  }

  return analysis.signals.filter((signal) => {
    return (
      signal &&
      typeof signal.type === 'string' &&
      Object.prototype.hasOwnProperty.call(SEVERITY_RANK, signal.severity)
    )
  })
}

async function aggregateAnomalyResult({
  monitorId,
  checkId,
  triggeredAt,
  result,
}) {
  if (!monitorId) {
    throw new Error('monitorId is required')
  }

  if (!checkId) {
    throw new Error('checkId is required')
  }

  const detectedAt = normalizeDate(triggeredAt, 'triggeredAt')
  const signals = getAnomalySignals(result)

  if (signals.length === 0) {
    return {
      aggregated: false,
      reason: 'NO_ANOMALY_SIGNALS',
      incident: null,
      events: [],
    }
  }

  return prisma.$transaction(async (transaction) => {
    const events = []
    let incident = null

    for (const signal of signals) {
      const existingEvent = await transaction.anomalyEvent.findFirst({
        where: {
          checkId,
          type: signal.type,
        },
        include: {
          incident: true,
        },
      })

      if (existingEvent) {
        incident = existingEvent.incident
        events.push(existingEvent)
        continue
      }

      const groupingStartedAt = new Date(
        detectedAt.getTime() -
          INCIDENT_GROUPING_MINUTES * 60 * 1000
      )

      incident = await transaction.incident.findFirst({
        where: {
          monitorId,
          status: {
            in: ['OPEN', 'ACKNOWLEDGED'],
          },
          lastEventAt: {
            gte: groupingStartedAt,
          },
        },
        orderBy: {
          lastEventAt: 'desc',
        },
      })

      if (!incident) {
        incident = await transaction.incident.create({
          data: {
            monitorId,
            status: 'OPEN',
            severity: signal.severity,
            title: buildIncidentTitle([signal.type]),
            reason: signal.message || null,
            startedAt: detectedAt,
            lastEventAt: detectedAt,
          },
        })
      }

      const event = await transaction.anomalyEvent.create({
        data: {
          incidentId: incident.id,
          monitorId,
          checkId,
          type: signal.type,
          severity: signal.severity,
          score: Number(signal.details?.score || result?.analysis?.score || 0),
          detectedAt,
          details: signal.details || null,
        },
      })

      const eventTypes = await transaction.anomalyEvent.findMany({
        where: {
          incidentId: incident.id,
        },
        select: {
          type: true,
        },
      })

      const types = eventTypes.map((eventType) => eventType.type)
      const highestSeverity = getHighestSeverity(
        incident.severity,
        signal.severity
      )

      incident = await transaction.incident.update({
        where: {
          id: incident.id,
        },
        data: {
          severity: highestSeverity,
          title: buildIncidentTitle(types),
          reason: signal.message || incident.reason,
          lastEventAt: detectedAt,
        },
      })

      events.push(event)
    }

    return {
      aggregated: true,
      incident,
      events,
    }
  })
}

module.exports = {
  aggregateAnomalyResult,
}