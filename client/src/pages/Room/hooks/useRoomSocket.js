import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/store'
import { connectSocket, getSocket, disconnectSocket } from '@/services'
import { deoptimizeStroke } from '@/utils/strokeOptimization'

/**
 * Custom hook to manage room socket connection and events
 * Extracted from Room.jsx to reduce file size and improve reusability
 */
export function useRoomSocket({ code, loaderRoom, toast }) {
  const navigate = useNavigate()
  const { 
    setCurrentRoom, 
    setParticipants, 
    addParticipant, 
    removeParticipant, 
    clearRoom,
    participants 
  } = useRoomStore()
  
  const kickedRef = useRef(false)
  // Use ref for toast to avoid re-running effect when toast reference changes
  const toastRef = useRef(toast)
  toastRef.current = toast
  
  const [socket, setSocket] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [previewStrokes, setPreviewStrokes] = useState({})
  const [cursors, setCursors] = useState({})
  const [connected, setConnected] = useState(false)
  const [roomReady, setRoomReady] = useState(false)
  const [wasConnected, setWasConnected] = useState(false) // Track if user ever joined successfully
  
  // Ref to track roomReady for retry logic (avoids stale closure)
  const roomReadyRef = useRef(false)
  roomReadyRef.current = roomReady

  // Set room from loader data immediately
  useEffect(() => {
    if (loaderRoom) {
      setCurrentRoom(loaderRoom)
    }
  }, [loaderRoom, setCurrentRoom])

  // Initialize socket connection
  useEffect(() => {
    if (!loaderRoom) {
      navigate('/dashboard')
      return
    }

    const sock = connectSocket()
    if (!sock) {
      console.error('Failed to connect socket')
      return
    }

    setSocket(sock)

    // Connection events
    sock.on('connect', () => {
      console.log('[SOCKET] Connected')
      setConnected(true)
      sock.emit('room:join', { roomCode: code })
    })

    sock.on('disconnect', (reason) => {
      console.warn('[SOCKET] Disconnected:', reason)
      setConnected(false)
      setRoomReady(false)
    })
    
    sock.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error.message)
    })

    // Room state sync
    sock.on('room:state', ({ strokes: roomStrokes, participants: roomParticipants }) => {
      // Debug: log stroke order (tool types)
      console.log('[room:state] Stroke order:', roomStrokes?.map(s => ({ id: s.id?.slice(-4), tool: s.tool })))
      
      setStrokes(roomStrokes || [])
      setParticipants(roomParticipants || [])
      setRoomReady(true)
      setWasConnected(true) // Mark that user successfully joined
    })

    // If socket is already connected (e.g., after hot reload), emit join immediately
    if (sock.connected) {
      setConnected(true)
      sock.emit('room:join', { roomCode: code })
    }

    // Retry join if room:state not received within 5 seconds
    let retryCount = 0
    const maxRetries = 3
    const retryInterval = setInterval(() => {
      if (sock.connected && !roomReadyRef.current && retryCount < maxRetries) {
        retryCount++
        sock.emit('room:join', { roomCode: code })
      } else {
        clearInterval(retryInterval)
        // If still not ready after all retries, show error
        if (!roomReadyRef.current && retryCount >= maxRetries) {
          toastRef.current.error('Failed to join room. Please refresh the page or try again later.')
        }
      }
    }, 5000)

    // User events
    sock.on('user:joined', (participant) => {
      addParticipant(participant)
      setCursors(prev => {
        if (prev[participant.id]) {
          return {
            ...prev,
            [participant.id]: {
              ...prev[participant.id],
              color: participant.color,
              username: participant.username
            }
          }
        }
        return prev
      })
    })

    sock.on('user:left', ({ id }) => {
      removeParticipant(id)
      setCursors(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    })

    // Drawing events
    sock.on('draw:stroke', ({ stroke, username, isPreview }) => {
      const fullStroke = deoptimizeStroke(stroke)
      
      // Note: Cursor updates now only come from cursor:move events
      // to prevent cursor jumping between startPoint and endPoint when drawing shapes
      
      if (isPreview) {
        setPreviewStrokes(prev => ({
          ...prev,
          [fullStroke.userId]: fullStroke
        }))
      } else {
        setPreviewStrokes(prev => {
          const updated = { ...prev }
          delete updated[fullStroke.userId]
          return updated
        })
        
        setStrokes(prev => {
          const existingIndex = prev.findIndex(s => s.id === fullStroke.id)
          
          if (existingIndex >= 0) {
            const existingStroke = prev[existingIndex]
            if (fullStroke.sequence && existingStroke.sequence && 
                fullStroke.sequence <= existingStroke.sequence) {
              return prev
            }
            const updated = [...prev]
            updated[existingIndex] = fullStroke
            return updated
          } else {
            // Add new stroke to end (preserve layer order, don't sort by sequence)
            return [...prev, fullStroke]
          }
        })
      }
    })

    sock.on('draw:complete', ({ strokeId }) => {
      // Remove preview stroke when drawing is complete
      setPreviewStrokes(prev => {
        const updated = { ...prev }
        // Find and remove preview with matching strokeId
        Object.keys(updated).forEach(userId => {
          if (updated[userId]?.id === strokeId) {
            delete updated[userId]
          }
        })
        return updated
      })
    })

    sock.on('draw:erase', ({ strokeId }) => {
      setStrokes(prev => prev.filter(s => s.id !== strokeId))
      // Also remove from preview strokes if exists
      setPreviewStrokes(prev => {
        const updated = { ...prev }
        // Find and remove preview with matching strokeId
        Object.keys(updated).forEach(userId => {
          if (updated[userId]?.id === strokeId) {
            delete updated[userId]
          }
        })
        return updated
      })
    })

    sock.on('draw:update', ({ stroke, isPreview }) => {
      if (isPreview) {
        // Preview update (during drag/resize) - temporarily show in strokes for smooth preview
        setStrokes(prev => prev.map(s => {
          if (s.id === stroke.id) {
            return { ...s, ...stroke, _isPreview: true }
          }
          return s
        }))
      } else {
        // Final update - apply permanently
        setStrokes(prev => prev.map(s => {
          if (s.id === stroke.id) {
            if (stroke.sequence && s.sequence && stroke.sequence <= s.sequence) {
              return s
            }
            const { _isPreview, ...rest } = s // Remove preview flag
            return { ...rest, ...stroke }
          }
          return s
        }))
      }
    })

    sock.on('draw:clear', () => {
      setStrokes([])
      setPreviewStrokes({}) // Also clear preview strokes
    })

    sock.on('draw:reorder', ({ strokeIds }) => {
      setStrokes(prev => {
        const strokeMap = new Map(prev.map(s => [s.id, s]))
        const newStrokes = strokeIds.map(id => strokeMap.get(id)).filter(Boolean)
        return newStrokes
      })
    })

    // Cursor updates with RAF batching
    let cursorUpdatePending = false
    sock.on('cursor:move', ({ userId, x, y, tool }) => {
      if (!cursorUpdatePending) {
        cursorUpdatePending = true
        requestAnimationFrame(() => {
          cursorUpdatePending = false
          setCursors(prev => {
            const { participants } = useRoomStore.getState()
            const participant = participants.find(p => p.id === userId)
            return {
              ...prev,
              [userId]: {
                x,
                y,
                tool: tool || prev[userId]?.tool || 'pen',
                color: participant?.color || prev[userId]?.color || '#888',
                username: participant?.username || prev[userId]?.username || 'User'
              }
            }
          })
        })
      }
    })

    // Room events
    sock.on('room:restored', ({ strokes: restoredStrokes, version }) => {
      setStrokes(restoredStrokes || [])
      toastRef.current.success(`Restored to version ${version}`)
    })

    sock.on('error', ({ message }) => {
      toastRef.current.error(message)
    })

    sock.on('save:error', ({ message }) => {
      toastRef.current.warning(message || 'Auto-save failed. Your changes may not be saved.')
    })

    sock.on('user:kicked', () => {
      if (kickedRef.current) return
      kickedRef.current = true
      toastRef.current.kicked()
      setTimeout(() => navigate('/dashboard'), 2000)
    })

    // Cleanup
    return () => {
      clearInterval(retryInterval)
      const sock = getSocket()
      if (sock) {
        sock.off('connect')
        sock.off('disconnect')
        sock.off('room:state')
        sock.off('user:joined')
        sock.off('user:left')
        sock.off('draw:stroke')
        sock.off('draw:complete')
        sock.off('draw:erase')
        sock.off('draw:update')
        sock.off('draw:clear')
        sock.off('draw:reorder')
        sock.off('cursor:move')
        sock.off('room:restored')
        sock.off('error')
        sock.off('save:error')
        sock.off('user:kicked')
      }
      disconnectSocket()
      clearRoom()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, loaderRoom, navigate, setCurrentRoom, setParticipants, addParticipant, removeParticipant, clearRoom])
  // Note: toast is intentionally excluded to prevent reconnection on toast updates

  // Update cursors when participants change
  useEffect(() => {
    setCursors(prev => {
      const updated = { ...prev }
      participants.forEach(p => {
        if (updated[p.id]) {
          updated[p.id].color = p.color
          updated[p.id].username = p.username
        }
      })
      return updated
    })
  }, [participants])

  // Retry connection
  const retryConnection = useCallback(() => {
    const sock = getSocket()
    if (sock) {
      if (!sock.connected) {
        sock.connect()
      }
      // Re-emit room join
      sock.emit('room:join', { roomCode: code })
    }
  }, [code])

  return {
    socket,
    strokes,
    setStrokes,
    previewStrokes,
    cursors,
    connected,
    roomReady,
    wasConnected,
    retryConnection
  }
}

/**
 * Custom hook for room actions (save, clear, etc.)
 */
export function useRoomActions({ socket, code, toast, confirm }) {
  const { updateRoom } = useRoomStore()
  
  // Use ref for toast to avoid callback recreation
  const toastRef = useRef(toast)
  toastRef.current = toast
  
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Note: Auto-save is handled server-side (5s debounce after each change)

  const handleClear = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Clear Canvas',
      message: 'Are you sure you want to clear the entire canvas? This cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (confirmed && socket) {
      socket.emit('draw:clear')
    }
  }, [socket, confirm])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { api } = await import('@/services')
      const { data } = await api.get(`/rooms/${code}/history`)
      setHistoryList(data.data.history || [])
    } catch (error) {
      toastRef.current.error('Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [code])

  const toggleHistory = useCallback(() => {
    if (!showHistory) {
      fetchHistory()
    }
    setShowHistory(prev => !prev)
  }, [showHistory, fetchHistory])

  const handleRestore = useCallback(async (version) => {
    const confirmed = await confirm({
      title: 'Restore Snapshot',
      message: `Are you sure you want to restore to version ${version}? Current canvas will be replaced.`,
      confirmText: 'Restore',
      cancelText: 'Cancel',
      type: 'warning'
    })
    
    if (confirmed && socket) {
      socket.emit('room:restore', { version })
      setShowHistory(false)
    }
  }, [socket, confirm])

  const handleKick = useCallback(async (targetUserId) => {
    const confirmed = await confirm({
      title: 'Kick User',
      message: 'Are you sure you want to kick this user from the room?',
      confirmText: 'Kick',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (confirmed && socket) {
      socket.emit('user:kick', { targetUserId })
      toastRef.current.success('User has been kicked')
    }
  }, [socket, confirm])

  const handleSaveSettings = useCallback(async (updates) => {
    setSettingsLoading(true)
    const result = await updateRoom(code, updates)
    setSettingsLoading(false)
    return result
  }, [code, updateRoom])

  const copyInviteLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toastRef.current.success('Invite link copied to clipboard!')
  }, [code])

  return {
    handleClear,
    handleKick,
    handleRestore,
    handleSaveSettings,
    copyInviteLink,
    toggleHistory,
    showHistory,
    setShowHistory,
    historyList,
    historyLoading,
    settingsLoading
  }
}
