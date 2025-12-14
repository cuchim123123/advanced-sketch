import { useEffect, useCallback } from 'react'
import { getSocket, connectSocket } from '@/services'
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
    // Get or connect socket
    let socket = getSocket()
    if (!socket) {
      socket = connectSocket()
    }
    if (!socket) return

    // Listen for room updates
    socket.on('dashboard:roomUpdate', handleRoomUpdate)

    return () => {
      socket.off('dashboard:roomUpdate', handleRoomUpdate)
    }
  }, [handleRoomUpdate])
}
