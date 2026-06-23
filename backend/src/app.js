const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const http = require('http')
const express = require('express')
const cors = require('cors')
const { initializeSocket } = require('./socket/statusGateway')
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

initializeSocket(server)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

app.use('/api/auth', authRoutes)
app.use('/api/monitors', monitorRoutes)
app.use('/api/workspaces', workspace)

module.exports = { app, server }