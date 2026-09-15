const incidentService = require('../services/incidentService')

function getUserId(req) {
  return req.user?.userId
}

function handleError(error, next) {
  if (error.statusCode) {
    return error
  }

  return next(error)
}

async function getIncidents(req, res, next) {
  try {
    const { monitorId } = req.params
    const { status } = req.query

    const incidents = await incidentService.listIncidents({
      monitorId,
      userId: getUserId(req),
      status,
    })

    return res.status(200).json({
      success: true,
      data: incidents,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, next)
  }
}

async function getIncident(req, res, next) {
  try {
    const { monitorId, incidentId } = req.params

    const incident = await incidentService.getIncident({
      monitorId,
      incidentId,
      userId: getUserId(req),
    })

    return res.status(200).json({
      success: true,
      data: incident,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, next)
  }
}

async function updateIncident(req, res, next) {
  try {
    const { monitorId, incidentId } = req.params
    const { status } = req.body

    const incident = await incidentService.updateIncidentStatus({
      monitorId,
      incidentId,
      userId: getUserId(req),
      status,
    })

    return res.status(200).json({
      success: true,
      message: 'Incident status updated successfully',
      data: incident,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, next)
  }
}

async function enqueueRca(req, res, next) {
  try {
    const { monitorId, incidentId } = req.params
    const { windowHours, maxIterations } = req.body

    const result = await incidentService.enqueueIncidentRca({
      monitorId,
      incidentId,
      userId: getUserId(req),
      windowHours,
      maxIterations,
      requestId: req.headers['x-request-id'],
    })

    return res.status(202).json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, next)
  }
}

async function getRca(req, res, next) {
  try {
    const { monitorId, incidentId } = req.params

    const report = await incidentService.getIncidentRca({
      monitorId,
      incidentId,
      userId: getUserId(req),
    })

    return res.status(200).json({
      success: true,
      data: report,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, next)
  }
}

module.exports = {
  getIncidents,
  getIncident,
  updateIncident,
  enqueueRca,
  getRca,
}