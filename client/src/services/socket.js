import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null
let reconnectTimer = null

export const connectSocket = () => {
  const { token, user, isGuest } = useAuthStore.getState()
  
  // Return existing connected socket
  if (socket?.connected) {
    return socket
  }
  
  // Clear any pending reconnect
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  // Clean up any disconnected socket
  if (socket) {
    socket.removeAllListeners()
    socket = null
  }

  // Build auth object based on user type
  const auth = {}
  
  if (isGuest && user) {
    // Guest authentication
    auth.guest = {
      id: user.id,
      username: user.username,
      isGuest: true
    }
  } else if (token) {
    // Regular user authentication
    auth.token = token
  } else {
    console.error('No auth credentials for socket connection')
    return null
  }

  socket = io({
    auth,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity, // Keep trying
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000, // Cap at 5 seconds
    randomizationFactor: 0.5, // Add jitter to prevent thundering herd
    timeout: 20000, // Connection timeout
    pingTimeout: 30000, // Ping timeout (detect dead connections)
    pingInterval: 25000, // Ping interval (keep connection alive)
  })

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id)
  })

  socket.on('connect_error', (error) => {
    // Silently handle common proxy errors
    if (error.message?.includes('ECONNABORTED') || 
        error.message?.includes('timeout') ||
        error.message?.includes('xhr poll error')) {
      // These are expected during reconnection, don't spam console
      return
    }
    console.error('Socket connection error:', error.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
    
    // If server disconnected us, try to reconnect after a short delay
    if (reason === 'io server disconnect') {
      reconnectTimer = setTimeout(() => {
        socket?.connect()
      }, 1000)
    }
  })

  // Handle reconnection events (silent)
  socket.io.on('reconnect', (attempt) => {
    console.log(`Reconnected after ${attempt} attempts`)
  })

  socket.io.on('reconnect_attempt', () => {
    // Silent - reduce console noise
  })

  socket.io.on('reconnect_error', () => {
    // Silent - reduce console noise during reconnection
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
