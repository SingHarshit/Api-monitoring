const { Server } = require('socket.io')

let io

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('join-workspace', (workspaceId) => {
      if (workspaceId) {
        socket.join(`workspace:${workspaceId}`)
      }
    })

    socket.on('join-monitor', (monitorId) => {
      if (monitorId) {
        socket.join(`monitor:${monitorId}`)
      }
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized')
  }

  return io
}

function emitMonitorStatus(monitorId, payload) {
  if (!io) return
  io.to(`monitor:${monitorId}`).emit('monitor-status', payload)
}

function emitWorkspaceStatus(workspaceId, payload) {
  if (!io) return
  io.to(`workspace:${workspaceId}`).emit('workspace-status', payload)
}

module.exports = {
  initializeSocket,
  getIO,
  emitMonitorStatus,
  emitWorkspaceStatus,
}