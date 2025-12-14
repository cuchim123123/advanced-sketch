import { useEffect, useCallback, useRef, useState } from 'react'

const DEFAULT_POLL_INTERVAL = 10000 // 10 seconds when tab is active

/**
 * Generic hook for polling data with visibility-aware updates
 * - Only polls when tab is visible
 * - Debounces rapid requests
 * - Supports manual refresh
 * 
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Object} options - Configuration options
 * @param {number} options.pollInterval - Polling interval in ms (default: 10000)
 * @param {number} options.debounceTime - Minimum time between fetches in ms (default: 3000)
 * @param {boolean} options.enabled - Whether polling is enabled (default: true)
 */
export function usePolling(fetchFn, options = {}) {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    debounceTime = 3000,
    enabled = true
  } = options

  const [isTabVisible, setIsTabVisible] = useState(!document.hidden)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pollIntervalRef = useRef(null)
  const lastFetchRef = useRef(0)

  // Fetch with debounce
  const fetchDebounced = useCallback(async (silent = true) => {
    const now = Date.now()
    if (now - lastFetchRef.current < debounceTime) return
    lastFetchRef.current = now
    
    await fetchFn(silent)
  }, [fetchFn, debounceTime])

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsTabVisible(visible)
      
      // Fetch immediately when tab becomes visible (silent refresh)
      if (visible && enabled) {
        fetchDebounced(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchDebounced, enabled])

  // Smart polling - only when tab is visible
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Only poll when tab is visible and enabled
    if (isTabVisible && enabled) {
      // Initial fetch (show loading only on first load)
      fetchDebounced(false)
      
      // Set up polling (always silent for background refresh)
      pollIntervalRef.current = setInterval(() => {
        fetchDebounced(true)
      }, pollInterval)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [isTabVisible, fetchDebounced, pollInterval, enabled])

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    lastFetchRef.current = 0 // Reset debounce
    
    try {
      await fetchFn(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchFn])

  return { isTabVisible, isRefreshing, manualRefresh }
}

export default usePolling
