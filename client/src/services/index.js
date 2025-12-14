// =============================================================================
// SERVICES BARREL FILE
// Re-export all API services for cleaner imports
// =============================================================================

// API service (axios instance)
export { default as api } from './api.service'

// Config
export { API_BASE_URL, SOCKET_URL, getDefaultHeaders, REQUEST_TIMEOUT } from './config'

// Socket service
export { 
  connectSocket, 
  getSocket, 
  disconnectSocket 
} from './socket.service'
