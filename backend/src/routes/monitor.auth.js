const express = require('express')
const auth = require('../middleware/auth')
const {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
} = require('../controllers/monitor.controller')
const {
  createMonitorSchema,
  updateMonitorSchema,
  monitorIdParamsSchema,
} = require('../validators/monitor.validator')

const router = express.Router()

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'params' ? req.params : req.body
    const result = schema.safeParse(data)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.flatten(),
      })
    }

    if (source === 'params') {
      req.params = result.data
    } else {
      req.body = result.data
    }

    next()
  }
}

router.use(auth)

router.post('/', validate(createMonitorSchema), createMonitor)
router.get('/', getMonitors)
router.get('/:id', validate(monitorIdParamsSchema, 'params'), getMonitorById)
router.put(
  '/:id',
  validate(monitorIdParamsSchema, 'params'),
  validate(updateMonitorSchema),
  updateMonitor
)
router.delete('/:id', validate(monitorIdParamsSchema, 'params'), deleteMonitor)

module.exports = router