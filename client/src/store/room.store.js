import { create } from 'zustand'
import api from '../services/api.service'

export const useRoomStore = create((set, get) => ({
  rooms: [],
  publicRooms: [],
  currentRoom: null,
  participants: [],
  loading: false,
  error: null,

  fetchRooms: async () => {
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
      set({ publicRooms: data.data.rooms || [], loading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, loading: false, publicRooms: [] })
    }
  },

  createRoom: async (name, password, maxParticipants) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/rooms', {
        name,
        password: password || undefined,
        maxParticipants
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

  joinRoom: async (code, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/rooms/${code}/join`, { password })
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
        rooms: state.rooms.map((r) => r.code === code ? updatedRoom : r),
        currentRoom: state.currentRoom?.code === code ? updatedRoom : state.currentRoom
      }))
      return { success: true, room: updatedRoom }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),

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
