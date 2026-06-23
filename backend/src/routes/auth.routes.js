const express = require('express')
const { register, login } = require('../controllers/auth.controller')
const { registerSchema, loginSchema } = require('../validators/auth.validator')

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

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)

module.exports = router