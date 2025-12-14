// =============================================================================
// API CONFIGURATION
// =============================================================================

// API Base URL - uses Vite proxy in development
export const API_BASE_URL = '/api';

// Socket URL - for WebSocket connections
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Default request headers
export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
});

// Request timeout
export const REQUEST_TIMEOUT = 15000;
