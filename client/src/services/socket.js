import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export const connectSocket = () => {
  const token = useAuthStore.getState().token
  
  if (!token) {
    console.error('No auth token for socket connection')
    return null
  }

  if (socket?.connected) {
    return socket
  }

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling']
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
    socket.disconnect()
    socket = null
  }
}
