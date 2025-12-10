import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

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
        set({ user: null, token: null, error: null })
      },

      clearError: () => set({ error: null }),
      
      setUser: (user, token) => {
        if (token) {
          localStorage.setItem('authToken', token)
        }
        set({ user, token })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
)
