const bcrypt = require('bcryptjs')
const prisma = require('../config/prisma')
const generateToken = require('../utils/generateToken')
const { recordAuthAttempt } = require('../services/alertService')

const SALT_ROUNDS = 10

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email: email.trim().toLowerCase(),
        passwordHash,
      },
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: sanitizeUser(user),
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  const startedAt = Date.now()
  const email = (req.body.email || '').trim().toLowerCase()
  const { password } = req.body
  const userAgent = req.get('user-agent')

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      const latencyMs = Date.now() - startedAt

      void recordAuthAttempt({
        email,
        statusCode: 401,
        latencyMs,
        reason: 'Invalid credentials',
        path: req.originalUrl,
        ip: req.ip,
        userAgent,
      }).catch((error) => {
        console.error('Auth alert failed:', error.message)
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      const latencyMs = Date.now() - startedAt

      void recordAuthAttempt({
        email,
        statusCode: 401,
        latencyMs,
        reason: 'Invalid credentials',
        path: req.originalUrl,
        ip: req.ip,
        userAgent,
      }).catch((error) => {
        console.error('Auth alert failed:', error.message)
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const latencyMs = Date.now() - startedAt

    void recordAuthAttempt({
      email,
      statusCode: 200,
      latencyMs,
      reason: 'Login successful',
      path: req.originalUrl,
      ip: req.ip,
      userAgent,
    }).catch((error) => {
      console.error('Auth alert failed:', error.message)
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        token,
      },
    })
  } catch (error) {
    const latencyMs = Date.now() - startedAt

    void recordAuthAttempt({
      email,
      statusCode: 500,
      latencyMs,
      reason: error.message,
      path: req.originalUrl,
      ip: req.ip,
      userAgent,
    }).catch((alertError) => {
      console.error('Auth alert failed:', alertError.message)
    })

    next(error)
  }
}

module.exports = {
  register,
  login,
}