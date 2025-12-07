import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export const connectSocket = () => {
  const token = useAuthStore.getState().token
  
  if (!token) {
    console.error('No auth token for socket connection')
    return null
  }

  // Return existing connected socket
  if (socket?.connected) {
    return socket
  }
  
  // Clean up any disconnected socket
  if (socket) {
    socket.removeAllListeners()
    socket = null
  }

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
