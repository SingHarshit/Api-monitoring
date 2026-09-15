const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const http = require('http')
const express = require('express')
const cors = require('cors')
const { initializeSocket } = require('./socket/statusGateway')
const { startPingScheduler } = require('./queues/scheduler')
const pingWorker = require('./queues/pingProcessor')
const authRoutes = require('./routes/auth.routes')
const monitorRoutes = require('./routes/monitor.auth')
const workspace = require('./routes/workspace.routes')
const analyticsRoutes = require('./routes/analytics.routes')
const rateLimiter = require('./middleware/rateLimiter')
const prisma = require('./config/prisma')
const redisClient = require('./config/redis')
const { dlqWorker, queueEvents, deadLetterQueue } = require('./workers/deadLetterWorker')
const aiWorker = require('./queues/aiProcessor')
const incidentWorker = require('./workers/incidentWorker')
const rcaWorker = require('./workers/rcaWorker')
const incidentRoutes = require('./routes/incident.routes')
const app = express()
const server = http.createServer(app)

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(rateLimiter({ windowMs: 60 * 1000, max: 100 }))
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Monitoring server is running',
  })
})
app.get('/api/health', async (req, res) => {
  const result = {
    status: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    worker: 'unknown',
    timestamp: new Date().toISOString(),
  }
  try {
    await prisma.$queryRaw('SELECT 1')
    result.database = 'up'
  } catch (err) {
    result.database = 'down'
    result.status = 'unhealthy'
  }

  try {
    const pong = await redisClient.ping()
    result.redis = pong === 'PONG' ? 'up' : 'down'
    if (result.redis === 'down') result.status = 'unhealthy'
  } catch (err) {
    result.redis = 'down'
    result.status = 'unhealthy'
  }
  try {
    if (pingWorker && typeof pingWorker.close === 'function') {
      result.worker = 'up'
    } else {
      result.worker = 'down'
      result.status = 'unhealthy'
    }
  } catch (err) {
    result.worker = 'down'
    result.status = 'unhealthy'
  }

  const statusCode = result.status === 'healthy' ? 200 : 503
  return res.status(statusCode).json(result)
})

app.use('/api/analytics', analyticsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/monitors', monitorRoutes)
app.use('/api/workspaces', workspace)
let io 



app.use('/api/incidents', incidentRoutes)

async function bootstrap() {
  io = initializeSocket(server)

  const cleanExisting = process.env.CLEAN_REPEAT_JOBS_ON_BOOT === 'true'
  await startPingScheduler({ cleanExisting })

  const PORT = process.env.PORT || 5000
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error)
  process.exit(1)
})

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`)

  async function safeClose(name, fn) {
    try {
      await fn()
      console.log(`${name} closed`)
    } catch (err) {
      console.error(`Failed to close ${name}:`, err?.message || err)
    }
  }
  if (pingWorker && typeof pingWorker.close === 'function') {
    await safeClose('pingWorker', () => pingWorker.close())
  }
  if (dlqWorker && typeof dlqWorker.close === 'function') {
    await safeClose('dlqWorker', () => dlqWorker.close())
  }
  if (queueEvents && typeof queueEvents.close === 'function') {
    await safeClose('queueEvents', () => queueEvents.close())
  }
  if (deadLetterQueue && typeof deadLetterQueue.close === 'function') {
    await safeClose('deadLetterQueue', () => deadLetterQueue.close())
  }
  if (redisClient && typeof redisClient.quit === 'function') {
    await safeClose('redis', () => redisClient.quit())
  } else if (redisClient && typeof redisClient.disconnect === 'function') {
    await safeClose('redis', () => redisClient.disconnect())
  }
  if (prisma && typeof prisma.$disconnect === 'function') {
    await safeClose('prisma', () => prisma.$disconnect())
  }
  if (aiWorker && typeof aiWorker.close === 'function') {
    await safeClose('aiWorker', () => aiWorker.close())
  }
  if (incidentWorker && typeof incidentWorker.close === 'function') {
    await safeClose('incidentWorker', () => incidentWorker.close())
  }
  if (rcaWorker && typeof rcaWorker.close === 'function') {
    await safeClose('rcaWorker', () => rcaWorker.close())
  }
  try {
    if (io && typeof io.close === 'function') {
      await new Promise((resolve, reject) => io.close((err) => (err ? reject(err) : resolve())))
      console.log('socket.io closed')
    }
  } catch (err) {
    console.error('Failed to close socket.io:', err?.message || err)
  }
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
  setTimeout(() => {
    console.warn('Forcing shutdown after timeout')
    process.exit(1)
  }, 30_000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

module.exports = { app, server }