import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token or guest headers to requests
api.interceptors.request.use((config) => {
  const { token, isGuest, user } = useAuthStore.getState()
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (isGuest && user) {
    // Add guest headers for private room access
    config.headers['X-Guest-Id'] = user.id
    config.headers['X-Guest-Username'] = user.username
  }
  
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if this is a login/register request - don't redirect on auth errors for these
    const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register') ||
                          error.config?.url?.includes('/auth/forgot-password') ||
                          error.config?.url?.includes('/auth/reset-password')
    
    if (error.response?.status === 401 && !isAuthRequest) {
      const { isGuest, logout } = useAuthStore.getState()
      // Only logout and redirect if NOT a guest and NOT an auth request
      // Guests are expected to get 401 on protected routes
      if (!isGuest) {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  resendVerificationEmail: async (email) => {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  }
}

export default api
