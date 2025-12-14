import { ArrowLeft, Link2, Settings, Users, Sparkles, History } from 'lucide-react'

/**
 * Room header component with controls
 */
export default function RoomHeader({
  roomName,
  roomCode,
  connected,
  participantCount,
  isOwner,
  showHistory,
  onLeave,
  onCopyLink,
  onToggleHistory,
  onOpenSettings,
  onToggleParticipants
}) {
  return (
    <header className="glass-dark border-b border-white/10 px-2 sm:px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onLeave}
          className="glass-dark-button p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-base sm:text-lg text-white truncate">{roomName}</h1>
        </div>
        <span className="text-xs sm:text-sm text-white/30 hidden sm:inline font-mono">({roomCode})</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400 glow-cyan' : 'bg-red-400'}`} />
          <span className="text-xs text-white/40 hidden sm:inline">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={onCopyLink}
          className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm text-purple-300 hover:text-purple-200 flex items-center gap-1.5"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Invite</span>
        </button>
        {isOwner && (
          <button
            onClick={onToggleHistory}
            className={`glass-dark-button px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5 ${showHistory ? 'text-amber-300' : 'text-amber-300/60 hover:text-amber-300'}`}
            title="Snapshot History"
          >
            <History className="w-4 h-4" />
          </button>
        )}
        {isOwner && (
          <button
            onClick={onOpenSettings}
            className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5"
            title="Room Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onToggleParticipants}
          className="glass-dark-button px-3 py-1.5 text-xs sm:text-sm text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5"
        >
          <Users className="w-4 h-4" />
          <span>{participantCount}</span>
        </button>
      </div>
    </header>
  )
}
