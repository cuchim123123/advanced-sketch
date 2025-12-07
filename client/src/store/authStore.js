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
          set({
            user: data.data.user,
            token: data.data.token,
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

      logout: () => {
        set({ user: null, token: null, error: null })
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
)
