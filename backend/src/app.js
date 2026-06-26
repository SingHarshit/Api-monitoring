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

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Monitoring server is running',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/monitors', monitorRoutes)
app.use('/api/workspaces', workspace)

async function bootstrap() {
  initializeSocket(server)

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

  try {
    await pingWorker.close()
  } catch (error) {
    console.error('Failed to close ping worker:', error.message)
  }

  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

module.exports = { app, server }