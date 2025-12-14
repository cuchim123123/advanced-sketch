import { create } from 'zustand'
import api from '../services/api.service'

export const useRoomStore = create((set, get) => ({
  rooms: [],
  publicRooms: [],
  currentRoom: null,
  participants: [],
  loading: false,
  error: null,

  fetchRooms: async (options = {}) => {
    const { silent = false } = options
    const currentRooms = get().rooms
    
    // Only show loading spinner on first fetch (no existing data)
    if (!silent && currentRooms.length === 0) {
      set({ loading: true })
    }
    
    try {
      const { data } = await api.get('/rooms')
      const newRooms = data.data.rooms || []
      
      // Smart merge: preserve local state while updating from server
      set((state) => {
        // If we have existing rooms, do a smart merge
        if (state.rooms.length > 0) {
          const mergedRooms = newRooms.map(newRoom => {
            const existing = state.rooms.find(r => r.code === newRoom.code)
            // Keep participant count if server hasn't updated it (avoids flicker)
            if (existing && newRoom.participantCount === existing.participantCount) {
              return { ...existing, ...newRoom }
            }
            return newRoom
          })
          return { rooms: mergedRooms, loading: false, error: null }
        }
        return { rooms: newRooms, loading: false, error: null }
      })
    } catch (error) {
      // On error, keep existing data
      set((state) => ({ 
        error: error.response?.data?.message, 
        loading: false,
        rooms: state.rooms // Keep existing rooms
      }))
    }
  },

  fetchPublicRooms: async (options = {}) => {
    const { silent = false } = options
    const currentPublicRooms = get().publicRooms
    
    // Only show loading on first fetch
    if (!silent && currentPublicRooms.length === 0) {
      set({ loading: true })
    }
    
    try {
      const { data } = await api.get('/rooms/public')
      const newRooms = data.data.rooms || []
      
      set((state) => {
        if (state.publicRooms.length > 0) {
          const mergedRooms = newRooms.map(newRoom => {
            const existing = state.publicRooms.find(r => r.code === newRoom.code)
            if (existing && newRoom.participantCount === existing.participantCount) {
              return { ...existing, ...newRoom }
            }
            return newRoom
          })
          return { publicRooms: mergedRooms, loading: false, error: null }
        }
        return { publicRooms: newRooms, loading: false, error: null }
      })
    } catch (error) {
      set((state) => ({ 
        error: error.response?.data?.message, 
        loading: false,
        publicRooms: state.publicRooms
      }))
    }
  },

  createRoom: async (name, options = {}) => {
    const { isPublic = false, maxParticipants = 10 } = options
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/rooms', {
        name,
        isPublic,
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

  // Update participant count for a room (used by dashboard socket)
  updateRoomParticipantCount: (roomCode, participantCount) => {
    set((state) => ({
      rooms: state.rooms.map((r) => 
        r.code === roomCode ? { ...r, participantCount } : r
      ),
      publicRooms: state.publicRooms.map((r) => 
        r.code === roomCode ? { ...r, participantCount } : r
      )
    }))
  },

  clearRoom: () => set({ currentRoom: null, participants: [] })
}))
