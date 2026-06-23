const express = require('express')
const auth = require('../middleware/auth')
const {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
} = require('../controllers/workspace.controller')
const { createWorkspaceSchema } = require('../validators/workspace.validator')

const router = express.Router()

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.flatten(),
      })
    }

    req.body = result.data
    next()
  }
}

router.use(auth)

router.post('/', validate(createWorkspaceSchema), createWorkspace)
router.get('/', getWorkspaces)
router.get('/:id', getWorkspaceById)

module.exports = router