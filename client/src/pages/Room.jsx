import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import { connectSocket, getSocket, disconnectSocket } from '../services/socket'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import Canvas from '../components/Canvas'
import RoomSettingsModal from '../components/RoomSettingsModal'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentRoom, getRoom, setParticipants, addParticipant, removeParticipant, participants, clearRoom, updateRoom } = useRoomStore()
  const toast = useToast()
  const confirm = useConfirm()
  const kickedRef = useRef(false)
  
  const [socket, setSocket] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [cursors, setCursors] = useState({})
  const [connected, setConnected] = useState(false)
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

      sock.on('cursor:move', ({ userId, x, y }) => {
        setCursors(prev => {
          // Get participant info from store or previous cursor data
          const { participants } = useRoomStore.getState()
          const participant = participants.find(p => p.id === userId)
          const existingCursor = prev[userId]
          return {
            ...prev,
            [userId]: {
              x,
              y,
              color: participant?.color || existingCursor?.color || '#888',
              username: participant?.username || existingCursor?.username || 'User'
            }
          }
        })
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
    }
  }, [socket])

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-2 sm:px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={handleLeave}
            className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            ← <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="font-semibold text-base sm:text-lg truncate">{currentRoom.name}</h1>
          <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">({code})</span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
          >
            💾 <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={copyInviteLink}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
          >
            📋 <span className="hidden sm:inline">Invite</span>
          </button>
          {/* Settings button - only for room owner */}
          {(currentRoom?.owner === user?.id || currentRoom?.owner?._id === user?.id || currentRoom?.isOwner) && (
            <button
              onClick={() => setShowSettings(true)}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 rounded hover:bg-gray-200"
              title="Room Settings"
            >
              ⚙️
            </button>
          )}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            👥 {participants.filter(p => p.id !== user?.id).length + 1}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <Canvas
            socket={socket}
            roomCode={code}
            strokes={strokes}
            onStrokeAdd={(stroke) => setStrokes(prev => [...prev, stroke])}
            cursors={cursors}
            showCursorNames={showParticipants}
          />
        </div>

        {/* Backdrop for mobile */}
        {showParticipants && (
          <div 
            className="fixed inset-0 bg-black/20 z-10 md:hidden"
            onClick={() => setShowParticipants(false)}
          />
        )}

        {/* Participants Sidebar */}
        <div 
          className={`
            fixed md:relative right-0 top-0 h-full z-20
            bg-white border-l shadow-lg md:shadow-none
            transform transition-transform duration-300 ease-in-out
            w-64 p-4 overflow-y-auto
            ${showParticipants ? 'translate-x-0' : 'translate-x-full md:hidden'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Participants</h2>
            <button 
              onClick={() => setShowParticipants(false)}
              className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <ul className="space-y-2">
            {/* Current user */}
            <li className="flex items-center gap-2 p-2 bg-indigo-50 rounded">
              <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{user?.username} (you)</span>
            </li>
            
            {/* Other participants */}
            {participants
              .filter(p => p.id !== user?.id)
              .map(participant => (
                <li
                  key={participant.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded group"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: participant.color }}
                  />
                  <span className="text-sm truncate flex-1">{participant.username}</span>
                  {/* Kick button - only visible to room owner */}
                  {(currentRoom?.owner === user?.id || currentRoom?.owner?._id === user?.id || currentRoom?.isOwner) && (
                    <button
                      onClick={() => handleKick(participant.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
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
            <p className="text-sm text-gray-400 mt-4">
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
