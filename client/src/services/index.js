// =============================================================================
// SERVICES BARREL FILE
// Re-export all API services for cleaner imports
// =============================================================================

// API service (axios instance)
export { default as api } from './api.service'

// Socket service
export { 
  connectSocket, 
  getSocket, 
  disconnectSocket 
} from './socket.service'

// Offline queue service
export { offlineQueue } from './offlineQueue.service'
