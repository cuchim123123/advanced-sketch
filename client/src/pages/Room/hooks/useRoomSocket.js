import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/store/roomStore'
import { connectSocket, getSocket, disconnectSocket } from '@/services/socket'
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
  
  const [socket, setSocket] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [previewStrokes, setPreviewStrokes] = useState({})
  const [cursors, setCursors] = useState({})
  const [connected, setConnected] = useState(false)
  const [roomReady, setRoomReady] = useState(false)

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
      setConnected(true)
      sock.emit('room:join', { roomCode: code })
    })

    sock.on('disconnect', () => {
      setConnected(false)
    })

    // Room state sync
    sock.on('room:state', ({ strokes: roomStrokes, participants: roomParticipants }) => {
      setStrokes(roomStrokes || [])
      setParticipants(roomParticipants || [])
      setRoomReady(true)
    })

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
      
      // Update cursor from stroke data
      if (fullStroke.userId && fullStroke.points?.length > 0) {
        const lastPoint = fullStroke.points[fullStroke.points.length - 1]
        const { participants } = useRoomStore.getState()
        const participant = participants.find(p => p.id === fullStroke.userId)
        setCursors(prev => ({
          ...prev,
          [fullStroke.userId]: {
            x: lastPoint.x,
            y: lastPoint.y,
            color: participant?.color || prev[fullStroke.userId]?.color || '#888',
            username: username || participant?.username || prev[fullStroke.userId]?.username || 'User'
          }
        }))
      }
      
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
            if (fullStroke.sequence) {
              const newStrokes = [...prev, fullStroke]
              return newStrokes.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
            }
            return [...prev, fullStroke]
          }
        })
      }
    })

    sock.on('draw:erase', ({ strokeId }) => {
      setStrokes(prev => prev.filter(s => s.id !== strokeId))
    })

    sock.on('draw:update', ({ stroke }) => {
      setStrokes(prev => prev.map(s => {
        if (s.id === stroke.id) {
          if (stroke.sequence && s.sequence && stroke.sequence <= s.sequence) {
            return s
          }
          return { ...s, ...stroke }
        }
        return s
      }))
    })

    sock.on('draw:clear', () => {
      setStrokes([])
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
    sock.on('room:saved', ({ version }) => {
      toast.success(`Snapshot saved (v${version})`)
    })

    sock.on('room:restored', ({ strokes: restoredStrokes, version }) => {
      setStrokes(restoredStrokes || [])
      toast.success(`Restored to version ${version}`)
    })

    sock.on('error', ({ message }) => {
      console.error('Socket error:', message)
      toast.error(message)
    })

    sock.on('user:kicked', () => {
      if (kickedRef.current) return
      kickedRef.current = true
      toast.kicked()
      setTimeout(() => navigate('/dashboard'), 2000)
    })

    // Cleanup
    return () => {
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
        sock.off('cursor:move')
        sock.off('room:saved')
        sock.off('room:restored')
        sock.off('error')
        sock.off('user:kicked')
      }
      disconnectSocket()
      clearRoom()
    }
  }, [code, loaderRoom, navigate, setCurrentRoom, setParticipants, addParticipant, removeParticipant, clearRoom, toast])

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

  return {
    socket,
    strokes,
    setStrokes,
    previewStrokes,
    cursors,
    connected,
    roomReady
  }
}

/**
 * Custom hook for room actions (save, clear, etc.)
 */
export function useRoomActions({ socket, code, toast, confirm, strokes, connected }) {
  const { updateRoom } = useRoomStore()
  
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  const handleSave = useCallback(() => {
    if (socket) {
      socket.emit('room:save')
      toast.success('Saved!')
    }
  }, [socket, toast])

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!socket || !connected) return
    
    let lastSavedStrokeCount = strokes.length
    
    const autoSaveInterval = setInterval(() => {
      if (strokes.length > 0 && strokes.length !== lastSavedStrokeCount) {
        socket.emit('room:save')
        lastSavedStrokeCount = strokes.length
        console.log('Auto-saved')
      }
    }, 2 * 60 * 1000)
    
    return () => clearInterval(autoSaveInterval)
  }, [socket, connected, strokes.length])

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
      const { default: api } = await import('@/services/api')
      const { data } = await api.get(`/rooms/${code}/history`)
      setHistoryList(data.data.history || [])
    } catch (error) {
      toast.error('Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [code, toast])

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
      toast.success('User has been kicked')
    }
  }, [socket, confirm, toast])

  const handleSaveSettings = useCallback(async (updates) => {
    setSettingsLoading(true)
    const result = await updateRoom(code, updates)
    setSettingsLoading(false)
    return result
  }, [code, updateRoom])

  const copyInviteLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toast.success('Invite link copied to clipboard!')
  }, [code, toast])

  return {
    handleSave,
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
