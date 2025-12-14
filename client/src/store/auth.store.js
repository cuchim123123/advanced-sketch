import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api.service'

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

      login: async (emailOrPhoneOrUsername, password) => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.post('/auth/login', { emailOrPhoneOrUsername, password })
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
        // Check if there's already a guest in the persisted state
        const currentState = get()
        if (currentState.isGuest && currentState.user?.isGuest) {
          // Already a guest, just return success
          return { success: true }
        }
        
        // Check localStorage for existing guest
        const storedGuest = localStorage.getItem('copad-guest')
        let guestUser
        
        if (storedGuest) {
          try {
            guestUser = JSON.parse(storedGuest)
          } catch {
            // Invalid stored guest, create new one
            guestUser = null
          }
        }
        
        if (!guestUser) {
          // Create new guest
          const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          guestUser = {
            id: guestId,
            username: `Guest_${guestId.slice(-6)}`,
            isGuest: true
          }
          localStorage.setItem('copad-guest', JSON.stringify(guestUser))
        }
        
        set({
          user: guestUser,
          token: null,
          isGuest: true,
          loading: false,
          error: null
        })
        return { success: true }
      },

      logout: () => {
        localStorage.removeItem('copad-guest')
        set({ user: null, token: null, isGuest: false, error: null })
      },

      updateProfile: async (updates) => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.patch('/auth/profile', updates)
          set((state) => ({
            user: { ...state.user, ...data.data.user },
            loading: false
          }))
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
        set({ loading: true, error: null })
        try {
          await api.patch('/auth/password', { currentPassword, newPassword })
          set({ loading: false })
          return { success: true }
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Password change failed',
            loading: false
          })
          return { success: false, error: error.response?.data?.message }
        }
      },

      setUser: (user, token) => {
        set({ user, token, isGuest: false, loading: false, error: null })
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isGuest: state.isGuest })
    }
  )
)
