const prisma = require('../config/prisma')

function getFinalRca(result) {
  return result?.finalRca || result?.final_rca || {}
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

  return prisma.rcaReport.upsert({
    where: { incidentId },
    create: {
      incidentId,
      status: 'COMPLETED',
      rootCause: finalRca.rootCause || null,
      explanation: finalRca.explanation || null,
      confidence: finalRca.confidence ?? null,
      hypotheses: result.hypotheses || [],
      evidence: result.evidence || [],
      validation: result.validation || null,
      recommendedActions:
        finalRca.recommendedActions ||
        finalRca.recommended_actions ||
        [],
      alternativeHypotheses:
        finalRca.alternativeHypotheses ||
        finalRca.alternative_hypotheses ||
        [],
      errors: result.errors || [],
      iterations: result.iterations || 0,
      completedAt: new Date(),
    },
    update: {
      status: 'COMPLETED',
      rootCause: finalRca.rootCause || null,
      explanation: finalRca.explanation || null,
      confidence: finalRca.confidence ?? null,
      hypotheses: result.hypotheses || [],
      evidence: result.evidence || [],
      validation: result.validation || null,
      recommendedActions:
        finalRca.recommendedActions ||
        finalRca.recommended_actions ||
        [],
      alternativeHypotheses:
        finalRca.alternativeHypotheses ||
        finalRca.alternative_hypotheses ||
        [],
      errors: result.errors || [],
      iterations: result.iterations || 0,
      completedAt: new Date(),
    },
  })
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