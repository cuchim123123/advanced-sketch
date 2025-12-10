import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

// Generate a random guest ID
const generateGuestId = () => {
  return 'guest_' + Math.random().toString(36).substring(2, 10)
}

// Generate a random fun guest name
const generateGuestName = () => {
  const adjectives = ['Happy', 'Clever', 'Swift', 'Brave', 'Calm', 'Bright', 'Cool', 'Kind', 'Quick', 'Smart']
  const nouns = ['Artist', 'Sketcher', 'Painter', 'Doodler', 'Creator', 'Designer', 'Drawer', 'Maker']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 1000)
  return `${adj}${noun}${num}`
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      isGuest: false,

      // Login as guest - reuse existing guest data if available, otherwise create new
      loginAsGuest: () => {
        const state = get()
        
        // If already a guest with existing data, just return success (reuse same identity)
        if (state.isGuest && state.user && state.token) {
          localStorage.setItem('authToken', state.token)
          return { success: true }
        }
        
        // Check if there's persisted guest data in localStorage
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage)
            if (parsed?.state?.isGuest && parsed?.state?.user && parsed?.state?.token) {
              // Restore existing guest session
              localStorage.setItem('authToken', parsed.state.token)
              set({
                user: parsed.state.user,
                token: parsed.state.token,
                isGuest: true,
                error: null
              })
              return { success: true }
            }
          } catch (e) {
            // Invalid JSON, create new guest
          }
        }
        
        // Create new guest identity
        const guestId = generateGuestId()
        const guestName = generateGuestName()
        const guestToken = `guest_${guestId}_${Date.now()}`
        
        const guestUser = {
          _id: guestId,
          id: guestId,
          username: guestName,
          email: null,
          avatar: null,
          isGuest: true
        }
        
        localStorage.setItem('authToken', guestToken)
        set({ 
          user: guestUser, 
          token: guestToken, 
          isGuest: true,
          error: null 
        })
        
        return { success: true }
      },

      register: async (username, email, password) => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.post('/auth/register', {
            username,
            email,
            password
          })
          // Don't set user/token - need email verification first
          set({ loading: false })
          return { 
            success: true, 
            message: data.message || 'Registration successful! Please check your email to verify your account.'
          }
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            loading: false
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      login: async (emailOrUsername, password) => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.post('/auth/login', { 
            emailOrPhoneOrUsername: emailOrUsername, 
            password 
          })
          
          set({
            user: data.data.user,
            token: data.data.token,
            loading: false
          })
          
          // Store token in localStorage for API interceptor
          if (data.data.token) {
            localStorage.setItem('authToken', data.data.token)
          }
          
          return { success: true }
        } catch (error) {
          const response = error.response?.data
          set({
            error: response?.message || 'Login failed',
            loading: false
          })
          
          // Check if OTP is needed
          if (response?.needOtp) {
            return { 
              success: false, 
              needOtp: true, 
              message: response.message 
            }
          }
          
          return { 
            success: false, 
            message: response?.message || 'Login failed',
            attemptsRemaining: response?.attemptsRemaining
          }
        }
      },

      logout: () => {
        localStorage.removeItem('authToken')
        set({ user: null, token: null, error: null, isGuest: false })
      },

      clearError: () => set({ error: null }),
      
      setUser: (user, token) => {
        if (token) {
          localStorage.setItem('authToken', token)
        }
        set({ user, token, isGuest: user?.isGuest || false })
      },

      updateProfile: async (updates) => {
        // Guests cannot update profile
        if (get().isGuest) {
          return { success: false, error: 'Guests cannot update profile. Please create an account.' }
        }
        set({ loading: true, error: null })
        try {
          const { data } = await api.patch('/auth/profile', updates)
          set({ user: data.data.user, loading: false })
          return { success: true }
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Update failed', 
            loading: false 
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        // Guests cannot change password
        if (get().isGuest) {
          return { success: false, error: 'Guests cannot change password. Please create an account.' }
        }
        set({ loading: true, error: null })
        try {
          await api.post('/auth/change-password', { currentPassword, newPassword })
          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({ 
            error: error.response?.data?.message || 'Password change failed', 
            loading: false 
          })
          return { success: false, error: error.response?.data?.message }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isGuest: state.isGuest })
    }
  )
)
