import { useEffect, useCallback } from 'react'
import { socket } from '@/services/socket'
import { useRoomStore } from '@/store'

/**
 * Hook to handle realtime updates for dashboard room list
 */
export function useDashboardSocket() {
  const { updateRoomParticipantCount } = useRoomStore()

  const handleRoomUpdate = useCallback(({ roomCode, participantCount }) => {
    console.log('[dashboard] Room update:', roomCode, 'participants:', participantCount)
    updateRoomParticipantCount(roomCode, participantCount)
  }, [updateRoomParticipantCount])

  useEffect(() => {
    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect()
    }

    // Listen for room updates
    socket.on('dashboard:roomUpdate', handleRoomUpdate)

    return () => {
      socket.off('dashboard:roomUpdate', handleRoomUpdate)
    }
  }, [handleRoomUpdate])

  return { connected: socket.connected }
}
