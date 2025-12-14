import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useRoomStore } from '@/store/roomStore'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmModal'
import RoomSettingsModal from '@/components/RoomSettingsModal'
import { Globe, Lock, Plus, LogIn } from 'lucide-react'
import {
  DashboardHeader,
  GuestBanner,
  MyRoomCard,
  PublicRoomCard,
  CreateRoomModal,
  JoinRoomModal
} from './components'

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [roomName, setRoomName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [joinCode, setJoinCode] = useState('')
  const [activeTab, setActiveTab] = useState('my')
  
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const { isGuest } = useAuthStore()
  const { rooms, publicRooms, fetchRooms, fetchPublicRooms, createRoom, joinRoom, deleteRoom, updateRoom, loading, error } = useRoomStore()

  useEffect(() => {
    if (!isGuest) fetchRooms()
    fetchPublicRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    const result = await createRoom(roomName, { isPublic, maxParticipants })
    if (result.success) {
      setShowCreateModal(false)
      setRoomName('')
      setIsPublic(false)
      setMaxParticipants(10)
      navigate(`/room/${result.room.code}`)
    }
  }

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    const result = await joinRoom(joinCode.toUpperCase())
    if (result.success) {
      setShowJoinModal(false)
      setJoinCode('')
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

  const handleUpdateRoom = async (updates) => {
    const result = await updateRoom(editingRoom.code, updates)
    if (result.success) {
      toast.success('Room updated successfully')
      setEditingRoom(null)
      fetchRooms()
    } else {
      toast.error(result.error || 'Failed to update room')
    }
  }

  return (
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb orb-purple w-96 h-96 -top-48 -left-48 animate-float" />
      <div className="orb orb-cyan w-80 h-80 top-1/2 -right-40 animate-float" style={{ animationDelay: '-2s' }} />
      <div className="orb orb-pink w-64 h-64 bottom-20 left-1/4 animate-float" style={{ animationDelay: '-4s' }} />

      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {isGuest && <GuestBanner />}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          {!isGuest && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-xl font-semibold 
                       hover:from-sky-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl
                       hover:scale-105 active:scale-95 flex items-center gap-2 glow-purple"
            >
              <Plus className="w-5 h-5" />
              Create Room
            </button>
          )}
          <button
            onClick={() => setShowJoinModal(true)}
            className="glass-button px-6 py-3 font-semibold flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Join Room
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {!isGuest && (
            <button
              onClick={() => setActiveTab('my')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg glow-purple'
                  : 'glass-button'
              }`}
            >
              <Lock className="w-4 h-4" />
              My Rooms
            </button>
          )}
          <button
            onClick={() => setActiveTab('public')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'public' || isGuest
                ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg glow-cyan'
                : 'glass-button'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public Rooms
          </button>
        </div>

        {/* My Rooms */}
        {activeTab === 'my' && !isGuest && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Your Rooms</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No rooms yet. Create one to get started!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <MyRoomCard
                    key={room.id || room._id}
                    room={room}
                    onEdit={setEditingRoom}
                    onDelete={handleDeleteRoom}
                    onCopyLink={copyInviteLink}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public Rooms */}
        {(activeTab === 'public' || isGuest) && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Public Rooms</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : publicRooms.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No public rooms available. Create one to share with everyone!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicRooms.map((room) => (
                  <PublicRoomCard key={room.id || room._id} room={room} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roomName={roomName}
        setRoomName={setRoomName}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        maxParticipants={maxParticipants}
        setMaxParticipants={setMaxParticipants}
        onSubmit={handleCreateRoom}
        loading={loading}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        onSubmit={handleJoinRoom}
        loading={loading}
        error={error}
      />

      <RoomSettingsModal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        room={editingRoom}
        onSave={handleUpdateRoom}
        loading={loading}
      />
    </div>
  )
}
