const express = require('express')
const auth = require('../middleware/auth')
const {
  getIncidents,
  getIncident,
  updateIncident,
  enqueueRca,
  getRca,
} = require('../controllers/incident.controller')
const {
  incidentParamsSchema,
  incidentDetailParamsSchema,
  incidentQuerySchema,
  updateIncidentSchema,
} = require('../validators/incident.validator')

const router = express.Router()

function validate(schema, source) {
  return (req, res, next) => {
    const input =
      source === 'params'
        ? req.params
        : source === 'query'
          ? req.query
          : req.body

    const result = schema.safeParse(input)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.flatten(),
      })
    }

    if (source === 'params') {
      req.params = result.data
    } else if (source === 'query') {
      req.query = result.data
    } else {
      req.body = result.data
    }

    next()
  }
}

router.use(auth)

router.get(
  '/:monitorId/incidents',
  validate(incidentParamsSchema, 'params'),
  validate(incidentQuerySchema, 'query'),
  getIncidents
)

router.get(
  '/:monitorId/incidents/:incidentId',
  validate(incidentDetailParamsSchema, 'params'),
  getIncident
)

router.patch(
  '/:monitorId/incidents/:incidentId',
  validate(incidentDetailParamsSchema, 'params'),
  validate(updateIncidentSchema, 'body'),
  updateIncident
)

router.post(
  '/:monitorId/incidents/:incidentId/rca',
  validate(incidentDetailParamsSchema, 'params'),
  enqueueRca
)

router.get(
  '/:monitorId/incidents/:incidentId/rca',
  validate(incidentDetailParamsSchema, 'params'),
  getRca
)

module.exports = router