import { Users, Crown } from 'lucide-react'

/**
 * Participants sidebar component for Room
 */
export default function ParticipantsSidebar({
  isOpen,
  onClose,
  participants,
  currentUser,
  currentRoom,
  isGuest,
  onKick
}) {
  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed md:relative right-0 top-0 h-full z-[70]
          glass-dark border-l border-white/10
          transform transition-transform duration-300 ease-in-out
          w-64 p-4 overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:hidden'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Participants
          </h2>
          <button 
            onClick={onClose}
            className="md:hidden text-white/40 hover:text-white/60 text-xl leading-none glass-dark-button w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        <ul className="space-y-2">
          {/* Current user */}
          <li className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate flex-1">
              {currentUser?.username} (you)
            </span>
            <div className="flex items-center gap-1">
              {currentRoom?.isOwner && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Owner
                </span>
              )}
              {isGuest && <span className="text-xs text-yellow-300/70">guest</span>}
            </div>
          </li>
          
          {/* Other participants */}
          {participants
            .filter(p => p.id !== currentUser?.id)
            .map(participant => {
              const isOwner = currentRoom?.owner?._id === participant.id || currentRoom?.owner === participant.id
              return (
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
                  </span>
                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                      </span>
                    )}
                    {participant.isGuest && (
                      <span className="text-xs text-yellow-300/70">guest</span>
                    )}
                    {currentRoom?.isOwner && (
                      <button
                        onClick={() => onKick(participant.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/20"
                        title="Kick user"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
        </ul>

        {participants.filter(p => p.id !== currentUser?.id).length === 0 && (
          <p className="text-sm text-white/30 mt-4 text-center">
            No one else is here yet. Share the invite link!
          </p>
        )}
      </div>
    </>
  )
}
