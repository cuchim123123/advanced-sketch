import { useEffect, useCallback, useRef, useState } from 'react'
import { getSocket } from '@/services'
import { useRoomStore, useAuthStore } from '@/store'

const POLL_INTERVAL = 10000 // 10 seconds when tab is active

/**
 * Hook to handle dashboard updates via socket + smart polling
 * - Only polls when tab is visible
 * - Socket updates participant count in realtime (no refetch needed)
 * - HTTP fetch is source of truth for room list
 */
export function useDashboardSocket() {
  const { updateRoomParticipantCount, fetchRooms, fetchPublicRooms } = useRoomStore()
  const { isGuest } = useAuthStore()
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pollIntervalRef = useRef(null)
  const lastFetchRef = useRef(0)

  // Handle socket events for participant count (realtime, no refetch)
  const handleRoomUpdate = useCallback(({ roomCode, participantCount }) => {
    // Only update count, don't refetch - WS is for count updates only
    updateRoomParticipantCount(roomCode, participantCount)
  }, [updateRoomParticipantCount])

  // Fetch rooms with debounce (silent mode for background refresh)
  const fetchRoomsDebounced = useCallback((silent = true) => {
    const now = Date.now()
    // Debounce: minimum 3 seconds between fetches
    if (now - lastFetchRef.current < 3000) return
    lastFetchRef.current = now
    
    if (!isGuest) fetchRooms({ silent })
    fetchPublicRooms({ silent })
  }, [isGuest, fetchRooms, fetchPublicRooms])

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsTabVisible(visible)
      
      // Fetch immediately when tab becomes visible (silent refresh)
      if (visible) {
        fetchRoomsDebounced(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchRoomsDebounced])

  // Smart polling - only when tab is visible
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Only poll when tab is visible
    if (isTabVisible) {
      // Initial fetch (show loading only on first load)
      fetchRoomsDebounced(false)
      
      // Set up polling (always silent for background refresh)
      pollIntervalRef.current = setInterval(() => {
        fetchRoomsDebounced(true)
      }, POLL_INTERVAL)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [isTabVisible, fetchRoomsDebounced])

  // Socket listener for realtime participant updates
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    socket.on('dashboard:roomUpdate', handleRoomUpdate)

    return () => {
      socket.off('dashboard:roomUpdate', handleRoomUpdate)
    }
  }, [handleRoomUpdate])

  // Manual refresh function (always shows brief loading indicator)
  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    lastFetchRef.current = 0 // Reset debounce
    
    try {
      const promises = [fetchPublicRooms({ silent: true })]
      if (!isGuest) promises.push(fetchRooms({ silent: true }))
      await Promise.all(promises)
    } finally {
      setIsRefreshing(false)
    }
  }, [isGuest, fetchRooms, fetchPublicRooms])

  return { isTabVisible, isRefreshing, manualRefresh }
}
