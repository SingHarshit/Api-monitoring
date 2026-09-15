const prisma = require('../config/prisma')
const {
  emitMonitorRca,
  emitWorkspaceRca,
} = require('../socket/statusGateway')

function getFinalRca(result) {
  return result?.finalRca || result?.final_rca || {}
}

function getField(object, camelCase, snakeCase, fallback = null) {
  return object?.[camelCase] ?? object?.[snakeCase] ?? fallback
}

async function markRcaRunning(incidentId) {
  return prisma.rcaReport.upsert({
    where: { incidentId },
    create: {
      incidentId,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    update: {
      status: 'RUNNING',
      startedAt: new Date(),
      completedAt: null,
      errors: null,
    },
  })
}

async function saveRcaResult({ incidentId, result }) {
  const finalRca = getFinalRca(result)

  const reportData = {
    status: 'COMPLETED',
    rootCause: getField(finalRca, 'rootCause', 'root_cause'),
    explanation: getField(finalRca, 'explanation', 'explanation'),
    confidence: getField(finalRca, 'confidence', 'confidence'),
    hypotheses: result.hypotheses || [],
    evidence: result.evidence || [],
    validation: result.validation || null,
    recommendedActions: getField(
      finalRca,
      'recommendedActions',
      'recommended_actions',
      [],
    ),
    alternativeHypotheses: getField(
      finalRca,
      'alternativeHypotheses',
      'alternative_hypotheses',
      [],
    ),
    errors: result.errors || [],
    iterations: result.iterations || 0,
    completedAt: new Date(),
  }

  const savedReport = await prisma.rcaReport.upsert({
    where: { incidentId },
    create: {
      incidentId,
      ...reportData,
    },
    update: reportData,
  })

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      anomalyEvents: {
        orderBy: {
          detectedAt: 'asc',
        },
      },
      rcaReport: true,
      monitor: {
        select: {
          workspaceId: true,
        },
      },
    },
  })

  if (incident) {
    const payload = {
      type: 'RCA_COMPLETED',
      incident,
      rcaReport: savedReport,
    }

    emitMonitorRca(incident.monitorId, payload)
    emitWorkspaceRca(incident.monitor.workspaceId, payload)
  }

  return savedReport
}

async function markRcaFailed({ incidentId, error }) {
  return prisma.rcaReport.upsert({
    where: { incidentId },
    create: {
      incidentId,
      status: 'FAILED',
      errors: [error.message],
      completedAt: new Date(),
    },
    update: {
      status: 'FAILED',
      errors: [error.message],
      completedAt: new Date(),
    },
  })
}

module.exports = {
  markRcaRunning,
  saveRcaResult,
  markRcaFailed,
}