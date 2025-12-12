import axios from 'axios'
import { useAuthStore } from '../store/authStore'

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
    if (error.response?.status === 401) {
      const { isGuest, logout } = useAuthStore.getState()
      // Only logout and redirect if NOT a guest
      // Guests are expected to get 401 on protected routes
      if (!isGuest) {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
