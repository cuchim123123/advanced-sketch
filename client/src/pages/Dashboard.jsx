import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import { Globe, Lock, Users } from 'lucide-react'

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [activeTab, setActiveTab] = useState('my') // 'my' or 'public'
  const toast = useToast()
  const confirm = useConfirm()

  const { user, logout } = useAuthStore()
  const { rooms, publicRooms, fetchRooms, fetchPublicRooms, createRoom, joinRoom, deleteRoom, loading, error } = useRoomStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchRooms()
    fetchPublicRooms()
  }, [])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    const result = await createRoom(roomName, roomPassword, undefined, isPublic)
    if (result.success) {
      setShowCreateModal(false)
      setRoomName('')
      setRoomPassword('')
      setIsPublic(false)
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
    const confirmed = await confirm({
      title: 'Delete Room',
      message: 'Are you sure you want to delete this room? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (confirmed) {
      const result = await deleteRoom(code)
      if (result.success) {
        toast.success('Room deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete room')
      }
    }
  }

  const copyInviteLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
    toast.success('Invite link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">Collaborative Sketch</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="text-gray-600 hover:text-indigo-600 flex items-center gap-1"
            >
              <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <span className="hidden sm:inline">{user?.username}</span>
            </button>
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'my'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Lock className="inline w-4 h-4 mr-2" />
            My Rooms
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'public'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe className="inline w-4 h-4 mr-2" />
            Public Rooms
          </button>
        </div>

        {/* My Rooms */}
        {activeTab === 'my' && (
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
                      <div className="flex gap-1">
                        {room.isPublic ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                        {room.isPasswordProtected && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            🔒
                          </span>
                        )}
                      </div>
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
        )}

        {/* Public Rooms */}
        {activeTab === 'public' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Public Rooms</h2>
            
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : publicRooms.length === 0 ? (
              <p className="text-gray-500">No public rooms available. Create one to share with everyone!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicRooms.map((room) => (
                  <div
                    key={room.id || room._id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      <div className="flex gap-1 items-center">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.participantCount || 0}/{room.maxParticipants}
                        </span>
                        {room.isPasswordProtected && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      by {room.owner?.username || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">Code: {room.code}</p>
                    <button
                      onClick={() => navigate(`/join/${room.code}`)}
                      className="w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                      Join Room
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              
              {/* Visibility Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      !isPublic
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Private</div>
                      <div className="text-xs opacity-75">Join via link only</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                      isPublic
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Public</div>
                      <div className="text-xs opacity-75">Visible to everyone</div>
                    </div>
                  </button>
                </div>
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
                  placeholder="Leave empty for no password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isPublic 
                    ? 'Public rooms with password still require it to join'
                    : 'Add a password for extra security'}
                </p>
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
