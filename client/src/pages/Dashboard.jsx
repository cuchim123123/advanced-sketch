import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')

  const { user, logout } = useAuthStore()
  const { rooms, fetchRooms, createRoom, joinRoom, deleteRoom, loading, error } = useRoomStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    const result = await createRoom(roomName, roomPassword)
    if (result.success) {
      setShowCreateModal(false)
      setRoomName('')
      setRoomPassword('')
      navigate(`/room/${result.room.code}`)
    }
  }

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    const result = await joinRoom(joinCode.toUpperCase(), joinPassword)
    if (result.success) {
      setShowJoinModal(false)
      setJoinCode('')
      setJoinPassword('')
      navigate(`/room/${joinCode.toUpperCase()}`)
    }
  }

  const handleDeleteRoom = async (code) => {
    if (confirm('Are you sure you want to delete this room?')) {
      await deleteRoom(code)
    }
  }

  const copyInviteLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    alert('Invite link copied!')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">Collaborative Sketch</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hello, {user?.username}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            + Create Room
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Join Room
          </button>
        </div>

        {/* Rooms List */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Rooms</h2>
          
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : rooms.length === 0 ? (
            <p className="text-gray-500">No rooms yet. Create one to get started!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id || room._id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{room.name}</h3>
                    {room.isPasswordProtected && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        🔒 Private
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Code: {room.code}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/room/${room.code}`)}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                      Enter
                    </button>
                    <button
                      onClick={() => copyInviteLink(room.code)}
                      className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.code)}
                      className="px-3 py-2 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="My Sketch Room"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (optional)
                </label>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Leave empty for public room"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Join Room</h2>
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                  placeholder="ABCD1234"
                  required
                  maxLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (if required)
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Room password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
