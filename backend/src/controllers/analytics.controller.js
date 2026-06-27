const prisma = require('../config/prisma')
const analyticsService = require('../services/analyticsService')

async function ensureMonitorExists(monitorId) {
  return prisma.monitor.findUnique({
    where: { id: monitorId },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  })
}

async function getUptime(req, res, next) {
  try {
    const { monitorId } = req.params
    const { hours } = req.query

    const monitor = await ensureMonitorExists(monitorId)
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    const data = await analyticsService.getUptimeAnalytics(monitorId, hours)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

async function getLatency(req, res, next) {
  try {
    const { monitorId } = req.params
    const { hours } = req.query

    const monitor = await ensureMonitorExists(monitorId)
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    const data = await analyticsService.getLatencyAnalytics(monitorId, hours)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

async function getHistory(req, res, next) {
  try {
    const { monitorId } = req.params
    const { hours } = req.query

    const monitor = await ensureMonitorExists(monitorId)
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    const data = await analyticsService.getHistoryAnalytics(monitorId, hours)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

async function getSuccessRate(req, res, next) {
  try {
    const { monitorId } = req.params
    const { hours } = req.query

    const monitor = await ensureMonitorExists(monitorId)
    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    const data = await analyticsService.getSuccessRateAnalytics(monitorId, hours)

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getUptime,
  getLatency,
  getHistory,
  getSuccessRate,
}