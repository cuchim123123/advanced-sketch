import { useState } from 'react'
import { useParams, useNavigate, useLoaderData } from 'react-router-dom'
import { useRoomStore } from '@/store/roomStore'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmModal'
import Canvas from '@/components/Canvas'
import Chat from '@/components/Chat'
import RoomSettingsModal from '@/components/RoomSettingsModal'
import { Sparkles } from 'lucide-react'

// Local components and hooks
import { useRoomSocket, useRoomActions } from './hooks'
import { RoomHeader, ParticipantsSidebar, HistoryPanel } from './components'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { room: loaderRoom } = useLoaderData()
  const { user, isGuest } = useAuthStore()
  const { currentRoom, participants } = useRoomStore()
  const toast = useToast()
  const confirm = useConfirm()
  
  // UI state
  const [showParticipants, setShowParticipants] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Socket connection and real-time state
  const {
    socket,
    strokes,
    setStrokes,
    previewStrokes,
    cursors,
    connected,
    roomReady
  } = useRoomSocket({ code, loaderRoom, toast })

  // Room actions (save, clear, kick, etc.)
  const {
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
  } = useRoomActions({ socket, code, toast, confirm, strokes, connected })

  // Settings save wrapper
  const onSaveSettings = async (updates) => {
    const result = await handleSaveSettings(updates)
    if (result.success) {
      toast.success('Room settings updated')
      setShowSettings(false)
    } else {
      toast.error(result.error || 'Failed to update settings')
    }
  }

  // Loading state
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
      <RoomHeader
        roomName={currentRoom.name}
        roomCode={code}
        connected={connected}
        participantCount={participants.filter(p => p.id !== user?.id).length + 1}
        isOwner={currentRoom?.isOwner}
        showHistory={showHistory}
        onLeave={() => navigate('/dashboard')}
        onSave={handleSave}
        onCopyLink={copyInviteLink}
        onToggleHistory={toggleHistory}
        onOpenSettings={() => setShowSettings(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative">
          {/* Loading overlay */}
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
            previewStrokes={previewStrokes}
            onStrokeAdd={(stroke) => setStrokes(prev => [...prev, stroke])}
            onStrokeUpdate={(stroke) => setStrokes(prev => prev.map(s => s.id === stroke.id ? stroke : s))}
            onClear={handleClear}
            onSave={handleSave}
            cursors={cursors}
            showCursorNames={showParticipants}
            disabled={false}
          />
        </div>

        {/* Participants Sidebar */}
        <ParticipantsSidebar
          isOpen={showParticipants}
          onClose={() => setShowParticipants(false)}
          participants={participants}
          currentUser={user}
          currentRoom={currentRoom}
          isGuest={isGuest}
          onKick={handleKick}
        />

        {/* History Panel */}
        {currentRoom?.isOwner && (
          <HistoryPanel
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            historyList={historyList}
            historyLoading={historyLoading}
            onRestore={handleRestore}
          />
        )}
      </div>

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        room={currentRoom}
        onSave={onSaveSettings}
        loading={settingsLoading}
      />

      {/* Chat Component */}
      <Chat
        socket={socket}
        roomCode={code}
        user={user}
        isOpen={showChat}
        onToggle={() => setShowChat(!showChat)}
      />
    </div>
  )
}
