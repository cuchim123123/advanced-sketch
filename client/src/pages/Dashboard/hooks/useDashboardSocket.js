import { useEffect, useCallback, useRef } from 'react'
import { getSocket } from '@/services'
import { useRoomStore } from '@/store'

/**
 * Hook to handle realtime updates for dashboard room list
 * Works when user already has an active socket connection
 */
export function useDashboardSocket() {
  const { updateRoomParticipantCount, fetchRooms, fetchPublicRooms } = useRoomStore()
  const lastUpdateRef = useRef(0)

  const handleRoomUpdate = useCallback(({ roomCode, participantCount }) => {
    console.log('[dashboard] Room update:', roomCode, 'participants:', participantCount)
    updateRoomParticipantCount(roomCode, participantCount)
  }, [updateRoomParticipantCount])

  // Also listen for when new rooms are created/deleted
  const handleRoomCreated = useCallback(() => {
    // Debounce to avoid too many refreshes
    const now = Date.now()
    if (now - lastUpdateRef.current > 2000) {
      lastUpdateRef.current = now
      fetchPublicRooms()
    }
  }, [fetchPublicRooms])

  useEffect(() => {
    // Try to get existing socket (user may already be connected from a room)
    const socket = getSocket()
    if (!socket) return

    // Listen for room updates
    socket.on('dashboard:roomUpdate', handleRoomUpdate)
    socket.on('dashboard:roomCreated', handleRoomCreated)

    return () => {
      socket.off('dashboard:roomUpdate', handleRoomUpdate)
      socket.off('dashboard:roomCreated', handleRoomCreated)
    }
  }, [handleRoomUpdate, handleRoomCreated])
}
