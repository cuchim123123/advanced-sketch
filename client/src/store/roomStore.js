import { create } from 'zustand'
import api from '../services/api'
import { useAuthStore } from './authStore'

export const useRoomStore = create((set, get) => ({
  rooms: [],
  publicRooms: [],
  currentRoom: null,
  participants: [],
  loading: false,
  error: null,

  fetchRooms: async () => {
    // Skip for guests - they don't have "My Rooms"
    const { isGuest } = useAuthStore.getState()
    if (isGuest) {
      set({ rooms: [], loading: false })
      return
    }
    
    set({ loading: true })
    try {
      const { data } = await api.get('/rooms')
      set({ rooms: data.data.rooms, loading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false })
    }
  },

  fetchPublicRooms: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/rooms/public')
      set({ publicRooms: data.data.rooms, loading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false })
    }
  },

  createRoom: async (name, isPublic = false, maxParticipants) => {
    // Guests cannot create rooms
    const { isGuest } = useAuthStore.getState()
    if (isGuest) {
      set({ error: 'Guests cannot create rooms. Please create an account.', loading: false })
      return { success: false, error: 'Guests cannot create rooms' }
    }
    
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/rooms', {
        name,
        maxParticipants,
        isPublic
      })
      const newRoom = data.data.room
      set((state) => ({
        rooms: [newRoom, ...state.rooms],
        loading: false
      }))
      return { success: true, room: newRoom }
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false })
      return { success: false, error: error.response?.data?.message }
    }
  },

  joinRoom: async (code) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/rooms/${code}/join`)
      set({ currentRoom: data.data.room, loading: false })
      return { success: true, room: data.data.room }
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false })
      return { success: false, error: error.response?.data?.message }
    }
  },

  getRoom: async (code) => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/rooms/${code}`)
      set({ currentRoom: data.data.room, loading: false })
      return { success: true, room: data.data.room }
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false })
      return { success: false }
    }
  },

  deleteRoom: async (code) => {
    try {
      await api.delete(`/rooms/${code}`)
      set((state) => ({
        rooms: state.rooms.filter((r) => r.code !== code)
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  updateRoom: async (code, updates) => {
    try {
      const { data } = await api.patch(`/rooms/${code}`, updates)
      const updatedRoom = data.data.room
      set((state) => ({
        rooms: state.rooms.map((r) => 
          r.code === code ? { ...r, ...updatedRoom } : r
        ),
        currentRoom: state.currentRoom?.code === code 
          ? { ...state.currentRoom, ...updatedRoom }
          : state.currentRoom
      }))
      return { success: true, room: updatedRoom }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) => {
    set((state) => {
      // Check if participant already exists to prevent duplicates
      if (state.participants.some(p => p.id === participant.id)) {
        return state
      }
      return {
        participants: [...state.participants, participant]
      }
    })
  },

  removeParticipant: (userId) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== userId)
    }))
  },

  clearRoom: () => set({ currentRoom: null, participants: [] })
}))
