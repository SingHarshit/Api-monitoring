const express = require('express')
const auth = require('../middleware/auth')
const {
  getUptime,
  getLatency,
  getHistory,
  getSuccessRate,
} = require('../controllers/analytics.controller')

const router = express.Router()

function validateMonitorId(req, res, next) {
  const { monitorId } = req.params

  if (!monitorId || typeof monitorId !== 'string' || !monitorId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Monitor ID is required',
    })
  }

  next()
}

function validateHours(req, res, next) {
  const { hours } = req.query

  if (hours === undefined || hours === null || hours === '') {
    return next()
  }

  const parsed = Number(hours)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Hours must be a positive number',
    })
  }

  next()
}

router.use(auth)

router.get('/:monitorId/uptime', validateMonitorId, validateHours, getUptime)
router.get('/:monitorId/latency', validateMonitorId, validateHours, getLatency)
router.get('/:monitorId/history', validateMonitorId, validateHours, getHistory)
router.get('/:monitorId/success-rate', validateMonitorId, validateHours, getSuccessRate)

module.exports = router