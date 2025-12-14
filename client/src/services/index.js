// =============================================================================
// SERVICES BARREL FILE
// Re-export all API services for cleaner imports
// =============================================================================

// API service (axios instance)
export { default as api } from './api'

// Socket service
export { 
  connectSocket, 
  getSocket, 
  disconnectSocket 
} from './socket'
