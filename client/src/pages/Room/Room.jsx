import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '@/store/roomStore'
import { useAuthStore } from '@/store/authStore'
import { connectSocket, getSocket, disconnectSocket } from '@/services/socket'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmModal'
import Canvas from '@/components/Canvas'
import RoomSettingsModal from '@/components/RoomSettingsModal'
import { ArrowLeft, Save, Link2, Settings, Users, Sparkles } from 'lucide-react'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, isGuest } = useAuthStore()
  const { currentRoom, getRoom, setParticipants, addParticipant, removeParticipant, participants, clearRoom, updateRoom } = useRoomStore()
  const toast = useToast()
  const confirm = useConfirm()
  const kickedRef = useRef(false)
  
  const [socket, setSocket] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [cursors, setCursors] = useState({})
  const [connected, setConnected] = useState(false)
  const [roomReady, setRoomReady] = useState(false)  // Track when room data is fully loaded
  const [showParticipants, setShowParticipants] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Initialize socket and join room
  useEffect(() => {
    const initRoom = async () => {
      // Get room info
      const result = await getRoom(code)
      if (!result.success) {
        navigate('/dashboard')
        return
      }

      // Connect socket
      const sock = connectSocket()
      if (!sock) {
        console.error('Failed to connect socket')
        return
      }

      setSocket(sock)

      // Socket event handlers
      sock.on('connect', () => {
        setConnected(true)
        sock.emit('room:join', { roomCode: code })
      })

      sock.on('disconnect', () => {
        setConnected(false)
      })

      sock.on('room:state', ({ strokes: roomStrokes, participants: roomParticipants }) => {
        setStrokes(roomStrokes || [])
        setParticipants(roomParticipants || [])
        setRoomReady(true)  // Room data is now ready
      })

      sock.on('user:joined', (participant) => {
        addParticipant(participant)
        // Update cursor with participant info if exists
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

      sock.on('draw:stroke', ({ stroke }) => {
        setStrokes(prev => {
          // Update existing stroke or add new
          const existing = prev.findIndex(s => s.id === stroke.id)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = stroke
            return updated
          }
          return [...prev, stroke]
        })
      })

      sock.on('draw:complete', ({ strokeId }) => {
        // Stroke completed, already in state
      })

      sock.on('draw:erase', ({ strokeId }) => {
        setStrokes(prev => prev.filter(s => s.id !== strokeId))
      })

      sock.on('draw:clear', () => {
        setStrokes([])
      })

      // Batch cursor updates using RAF for performance
      let cursorUpdatePending = false
      const pendingCursors = {}
      
      sock.on('cursor:move', ({ userId, x, y }) => {
        // Queue cursor update
        const { participants } = useRoomStore.getState()
        const participant = participants.find(p => p.id === userId)
        pendingCursors[userId] = {
          x,
          y,
          color: participant?.color || pendingCursors[userId]?.color || '#888',
          username: participant?.username || pendingCursors[userId]?.username || 'User'
        }
        
        // Batch updates with RAF
        if (!cursorUpdatePending) {
          cursorUpdatePending = true
          requestAnimationFrame(() => {
            cursorUpdatePending = false
            setCursors(prev => ({ ...prev, ...pendingCursors }))
          })
        }
      })

      sock.on('room:saved', ({ version }) => {
        console.log('Room saved, version:', version)
      })

      sock.on('error', ({ message }) => {
        console.error('Socket error:', message)
        toast.error(message)
      })

      // IMPORTANT: Listen for kick event - use ref to prevent duplicate
      sock.on('user:kicked', () => {
        if (kickedRef.current) return // Already handled
        kickedRef.current = true
        console.log('Received user:kicked event!')
        toast.kicked()
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      })
    }

    initRoom()

    // Cleanup
    return () => {
      const sock = getSocket()
      if (sock) {
        // Remove all listeners before disconnecting
        sock.off('connect')
        sock.off('disconnect')
        sock.off('room:state')
        sock.off('user:joined')
        sock.off('user:left')
        sock.off('draw:stroke')
        sock.off('draw:complete')
        sock.off('draw:erase')
        sock.off('draw:clear')
        sock.off('cursor:move')
        sock.off('room:saved')
        sock.off('error')
        sock.off('user:kicked')
      }
      disconnectSocket()
      clearRoom()
    }
  }, [code])

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

  const handleSave = useCallback(() => {
    if (socket) {
      socket.emit('room:save')
      toast.success('Saved!')
    }
  }, [socket, toast])

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!socket || !connected) return
    
    const autoSaveInterval = setInterval(() => {
      if (strokes.length > 0) {
        socket.emit('room:save')
        console.log('Auto-saved')
      }
    }, 2 * 60 * 1000) // 2 minutes
    
    return () => clearInterval(autoSaveInterval)
  }, [socket, connected, strokes.length])

  // Confirm before clear
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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toast.success('Invite link copied to clipboard!')
  }

  const handleLeave = () => {
    navigate('/dashboard')
  }

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
    
    if (result.success) {
      toast.success('Room settings updated')
      setShowSettings(false)
    } else {
      toast.error(result.error || 'Failed to update settings')
    }
  }, [code, updateRoom, toast])

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/80">Loading room...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
      {/* Header */}
      <header className="glass-dark border-b border-white/10 px-2 sm:px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={handleLeave}
            className="glass-dark-button p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-base sm:text-lg text-white truncate">{currentRoom.name}</h1>
          </div>
          <span className="text-xs sm:text-sm text-white/30 hidden sm:inline font-mono">({code})</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400 glow-cyan' : 'bg-red-400'}`} />
            <span className="text-xs text-white/40 hidden sm:inline">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm text-green-300 hover:text-green-200 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={copyInviteLink}
            className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm text-purple-300 hover:text-purple-200 flex items-center gap-1.5"
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Invite</span>
          </button>
          {/* Settings button - only for room owner */}
          {(currentRoom?.owner === user?.id || currentRoom?.owner?._id === user?.id || currentRoom?.isOwner) && (
            <button
              onClick={() => setShowSettings(true)}
              className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5"
              title="Room Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>{participants.filter(p => p.id !== user?.id).length + 1}</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative">
          {/* Loading overlay - shown until room data is ready */}
          {!roomReady && (
            <div className="absolute inset-0 z-50 bg-slate-100 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-sky-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 font-medium">Loading canvas...</p>
                  <p className="text-slate-500 text-sm mt-1">Syncing room data</p>
                </div>
              </div>
            </div>
          )}
          <Canvas
            socket={socket}
            roomCode={code}
            strokes={strokes}
            onStrokeAdd={(stroke) => setStrokes(prev => [...prev, stroke])}
            onClear={handleClear}
            onSave={handleSave}
            cursors={cursors}
            showCursorNames={showParticipants}
            disabled={!roomReady}
          />
        </div>

        {/* Backdrop for mobile */}
        {showParticipants && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-10 md:hidden"
            onClick={() => setShowParticipants(false)}
          />
        )}

        {/* Participants Sidebar */}
        <div 
          className={`
            fixed md:relative right-0 top-0 h-full z-20
            glass-dark border-l border-white/10
            transform transition-transform duration-300 ease-in-out
            w-64 p-4 overflow-y-auto
            ${showParticipants ? 'translate-x-0' : 'translate-x-full md:hidden'}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Participants
            </h2>
            <button 
              onClick={() => setShowParticipants(false)}
              className="md:hidden text-white/40 hover:text-white/60 text-xl leading-none glass-dark-button w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <ul className="space-y-2">
            {/* Current user */}
            <li className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white truncate">
                {user?.username} (you)
                {isGuest && <span className="ml-1 text-xs text-yellow-300/70">guest</span>}
              </span>
            </li>
            
            {/* Other participants */}
            {participants
              .filter(p => p.id !== user?.id)
              .map(participant => (
                <li
                  key={participant.id}
                  className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 group"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: participant.color }}
                  />
                  <span className="text-sm truncate flex-1 text-white/80">
                    {participant.username}
                    {participant.isGuest && (
                      <span className="ml-1 text-xs text-yellow-300/70">(guest)</span>
                    )}
                  </span>
                  {/* Kick button - only visible to room owner */}
                  {(currentRoom?.owner === user?.id || currentRoom?.owner?._id === user?.id || currentRoom?.isOwner) && (
                    <button
                      onClick={() => handleKick(participant.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/20"
                      title="Kick user"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))
            }
          </ul>

          {participants.filter(p => p.id !== user?.id).length === 0 && (
            <p className="text-sm text-white/30 mt-4 text-center">
              No one else is here yet. Share the invite link!
            </p>
          )}
        </div>
      </div>

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        room={currentRoom}
        onSave={handleSaveSettings}
        loading={settingsLoading}
      />
    </div>
  )
}
