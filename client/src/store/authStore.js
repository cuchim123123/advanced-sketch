import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isGuest: false,
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
          set({
            user: data.data.user,
            token: data.data.token,
            isGuest: false,
            loading: false
          })
          return { success: true }
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            loading: false
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          set({
            user: data.data.user,
            token: data.data.token,
            isGuest: false,
            loading: false
          })
          return { success: true }
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Login failed',
            loading: false
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      loginAsGuest: () => {
        const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        set({
          user: {
            id: guestId,
            username: `Guest_${guestId.slice(-6)}`,
            isGuest: true
          },
          token: null,
          isGuest: true,
          loading: false,
          error: null
        })
        return { success: true }
      },

      logout: () => {
        set({ user: null, token: null, isGuest: false, error: null })
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isGuest: state.isGuest })
    }
  )
)
