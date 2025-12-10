import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import { Globe, Lock, Users, Plus, LogIn, LogOut, User, Sparkles } from 'lucide-react'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Zustand functions are stable

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
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb orb-purple w-96 h-96 -top-48 -left-48 animate-float" />
      <div className="orb orb-cyan w-80 h-80 top-1/2 -right-40 animate-float" style={{ animationDelay: '-2s' }} />
      <div className="orb orb-pink w-64 h-64 bottom-20 left-1/4 animate-float" style={{ animationDelay: '-4s' }} />

      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center glow-purple">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">CoPad</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="glass-button px-4 py-2 flex items-center gap-2 text-white/80 hover:text-white"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-white">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline">{user?.username}</span>
            </button>
            <button
              onClick={logout}
              className="glass-button px-4 py-2 text-white/60 hover:text-white flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold 
                     hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl
                     hover:scale-105 active:scale-95 flex items-center gap-2 glow-purple"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="glass-button px-6 py-3 text-white font-semibold flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Join Room
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'my'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg glow-purple'
                : 'glass-button text-white/70 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            My Rooms
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'public'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg glow-cyan'
                : 'glass-button text-white/70 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public Rooms
          </button>
        </div>

        {/* My Rooms */}
        {activeTab === 'my' && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Your Rooms</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-white/50 text-center py-8">No rooms yet. Create one to get started!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <div
                    key={room.id || room._id}
                    className="glass rounded-xl p-4 hover:bg-white/15 transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-white">{room.name}</h3>
                      <div className="flex gap-1">
                        {room.isPublic ? (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-lg flex items-center gap-1 border border-green-500/30">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg flex items-center gap-1 border border-white/20">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                        {room.isPasswordProtected && (
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/40 mb-4 font-mono">Code: {room.code}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/room/${room.code}`)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg 
                                 hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                      >
                        Enter
                      </button>
                      <button
                        onClick={() => copyInviteLink(room.code)}
                        className="px-3 py-2 glass-button text-white/60 hover:text-white text-sm"
                        title="Copy invite link"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.code)}
                        className="px-3 py-2 bg-red-500/20 text-red-300 text-sm rounded-xl hover:bg-red-500/30 
                                 border border-red-500/30 transition-all duration-300"
                        title="Delete room"
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
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Public Rooms</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : publicRooms.length === 0 ? (
              <p className="text-white/50 text-center py-8">No public rooms available. Create one to share with everyone!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicRooms.map((room) => (
                  <div
                    key={room.id || room._id}
                    className="glass rounded-xl p-4 hover:bg-white/15 transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-white">{room.name}</h3>
                      <div className="flex gap-1 items-center">
                        <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg flex items-center gap-1 border border-cyan-500/30">
                          <Users className="w-3 h-3" />
                          {room.participantCount || 0}/{room.maxParticipants}
                        </span>
                        {room.isPasswordProtected && (
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/50 mb-1">
                      by {room.owner?.username || 'Unknown'}
                    </p>
                    <p className="text-xs text-white/30 mb-4 font-mono">Code: {room.code}</p>
                    <button
                      onClick={() => navigate(`/join/${room.code}`)}
                      className="w-full px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg 
                               hover:from-cyan-600 hover:to-blue-600 transition-all duration-300"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-xl font-semibold mb-4 text-white">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-white"
                  placeholder="My Sketch Room"
                  required
                />
              </div>
              
              {/* Visibility Toggle */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Room Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                      !isPublic
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/20 text-white/50 hover:bg-white/5'
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
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                      isPublic
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                        : 'border-white/20 text-white/50 hover:bg-white/5'
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
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Password (optional)
                </label>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-white"
                  placeholder="Leave empty for no password"
                />
                <p className="text-xs text-white/40 mt-1">
                  {isPublic 
                    ? 'Public rooms with password still require it to join'
                    : 'Add a password for extra security'}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 glass-button text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl 
                           hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-xl font-semibold mb-4 text-white">Join Room</h2>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 glass-input text-white uppercase font-mono tracking-wider"
                  placeholder="ABCD1234"
                  required
                  maxLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Password (if required)
                </label>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full px-4 py-3 glass-input text-white"
                  placeholder="Room password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-4 py-3 glass-button text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl 
                           hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50"
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
