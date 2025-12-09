import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import { connectSocket, getSocket, disconnectSocket } from '../services/socket'
import Canvas from '../components/Canvas'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentRoom, getRoom, setParticipants, addParticipant, removeParticipant, participants, clearRoom } = useRoomStore()
  
  const [socket, setSocket] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [cursors, setCursors] = useState({})
  const [connected, setConnected] = useState(false)
  const [showParticipants, setShowParticipants] = useState(true)

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
        alert(message)
      })
    }

    initRoom()

    // Cleanup
    return () => {
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
    alert('Invite link copied!')
  }

  const handleLeave = () => {
    navigate('/dashboard')
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeave}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="font-semibold text-lg">{currentRoom.name}</h1>
          <span className="text-sm text-gray-400">({code})</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
          >
            💾 Save
          </button>
          <button
            onClick={copyInviteLink}
            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
          >
            📋 Invite
          </button>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            👥 {participants.filter(p => p.id !== user?.id).length + 1}
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1">
          <Canvas
            socket={socket}
            roomCode={code}
            strokes={strokes}
            onStrokeAdd={(stroke) => setStrokes(prev => [...prev, stroke])}
            cursors={cursors}
            showCursorNames={showParticipants}
          />
        </div>

        {/* Participants Sidebar */}
        <div 
          className={`bg-white border-l overflow-hidden transition-all duration-300 ease-in-out ${
            showParticipants ? 'w-64 p-4' : 'w-0 p-0'
          }`}
        >
          <div className={`transition-opacity duration-200 ${showParticipants ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="font-semibold mb-3 whitespace-nowrap">Participants</h2>
            <ul className="space-y-2">
              {/* Current user */}
              <li className="flex items-center gap-2 p-2 bg-indigo-50 rounded">
                <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">{user?.username} (you)</span>
              </li>
              
              {/* Other participants */}
              {participants
                .filter(p => p.id !== user?.id)
                .map(participant => (
                  <li
                    key={participant.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: participant.color }}
                    />
                    <span className="text-sm whitespace-nowrap">{participant.username}</span>
                  </li>
                ))
              }
            </ul>

            {participants.filter(p => p.id !== user?.id).length === 0 && (
              <p className="text-sm text-gray-400 mt-4 whitespace-nowrap">
                No one else is here yet. Share the invite link!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
