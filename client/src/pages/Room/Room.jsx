import { useState } from 'react'
import { useParams, useNavigate, useLoaderData } from 'react-router-dom'
import { useRoomStore, useAuthStore } from '@/store'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmModal'
import Canvas from '@/components/Canvas'
import Chat from '@/components/Chat'
import RoomSettingsModal from '@/components/RoomSettingsModal'
import { Paintbrush, WifiOff, RefreshCw, LogOut } from 'lucide-react'

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
    roomReady,
    wasConnected,
    retryConnection
  } = useRoomSocket({ code, loaderRoom, toast })

  // Room actions (clear, kick, etc.)
  const {
    handleClear,
    handleKick,
    handleRestore,
    handleCreateSnapshot,
    handleSaveSettings,
    copyInviteLink,
    toggleHistory,
    showHistory,
    setShowHistory,
    historyList,
    historyLoading,
    settingsLoading
  } = useRoomActions({ socket, code, toast, confirm })

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

  // Loading state - use loaderRoom as fallback since currentRoom may not be set yet
  const room = currentRoom || loaderRoom
  if (!room) {
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
        roomName={room.name}
        roomCode={code}
        connected={connected}
        participantCount={participants.filter(p => p.id !== user?.id).length + 1}
        isOwner={room?.isOwner}
        showHistory={showHistory}
        onLeave={() => navigate('/dashboard')}
        onCopyLink={copyInviteLink}
        onToggleHistory={toggleHistory}
        onOpenSettings={() => setShowSettings(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 min-w-0 relative">
          {/* Disconnected overlay - show when user was connected but now disconnected */}
          {!connected && wasConnected && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <WifiOff className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Lost</h3>
                <p className="text-slate-600 mb-6">
                  Your connection to the room has been interrupted. 
                  Your recent changes may not be saved.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave
                  </button>
                  <button
                    onClick={retryConnection}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading overlay */}
          {!roomReady && (
            <div className="absolute inset-0 z-50 bg-slate-100 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
                  <Paintbrush className="w-6 h-6 text-sky-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 font-medium">Loading canvas...</p>
                  <p className="text-slate-500 text-sm mt-1">Syncing room data</p>
                </div>
              </div>
            </div>
          )}
          {/* Only render Canvas when room is ready - prevents race conditions */}
          {roomReady && (
            <Canvas
              socket={socket}
              roomCode={code}
              strokes={strokes}
              previewStrokes={previewStrokes}
              onStrokeAdd={(stroke) => setStrokes(prev => [...prev, stroke])}
              onStrokeUpdate={(stroke) => setStrokes(prev => prev.map(s => s.id === stroke.id ? stroke : s))}
              onClear={handleClear}
              cursors={cursors}
              showCursorNames={showParticipants}
              disabled={false}
            />
          )}
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
            onCreateSnapshot={handleCreateSnapshot}
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
