import { Globe, Lock, Users } from 'lucide-react'

export function CreateRoomModal({ 
  isOpen, 
  onClose, 
  roomName, 
  setRoomName, 
  isPublic, 
  setIsPublic,
  maxParticipants,
  setMaxParticipants,
  onSubmit,
  loading 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 animate-scale-in">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Create New Room</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 glass-input"
              placeholder="My Sketch Room"
              required
            />
          </div>
          
          {/* Visibility Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Room Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  !isPublic
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
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
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-400 hover:bg-slate-50'
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

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-3 glass-input"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 glass-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-xl 
                       hover:from-sky-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function JoinRoomModal({ isOpen, onClose, joinCode, setJoinCode, onSubmit, loading, error }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 animate-scale-in">
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Join Room</h2>
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Room Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 glass-input uppercase font-mono tracking-wider"
              placeholder="ABCD1234"
              required
              maxLength={8}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 glass-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl 
                       hover:from-sky-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
