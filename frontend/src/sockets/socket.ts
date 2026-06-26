import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
  const socketUrl = apiBaseUrl.replace('/api', '') // Remove /api suffix if present

  socket = io(socketUrl, {
    auth: {
      token: localStorage.getItem('token') || localStorage.getItem('accessToken'),
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id)
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected')
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error)
  })

  return socket
}

export function getSocket(): Socket {
  if (!socket) {
    return initializeSocket()
  }
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}