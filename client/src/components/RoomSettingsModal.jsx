import { useState, useEffect } from 'react'
import { Settings, X, Globe, Lock, Users } from 'lucide-react'

export default function RoomSettingsModal({ 
  isOpen, 
  onClose, 
  room, 
  onSave,
  loading 
}) {
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [maxParticipants, setMaxParticipants] = useState(10)

  useEffect(() => {
    if (room) {
      setName(room.name || '')
      setIsPublic(room.isPublic || false)
      setMaxParticipants(room.maxParticipants || 10)
    }
  }, [room, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const updates = {
      name,
      isPublic,
      maxParticipants
    }

    await onSave(updates)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-500" />
            Room Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              maxLength={100}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
                  !isPublic 
                    ? 'border-primary-500 bg-primary-50 text-primary-600' 
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
                  isPublic 
                    ? 'border-accent-500 bg-accent-50 text-accent-600' 
                    : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isPublic 
                ? 'Anyone can discover and join this room' 
                : 'Only accessible via invite link or code'}
            </p>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              <Users className="w-4 h-4 inline mr-1 text-primary-500" />
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl 
                       hover:from-primary-600 hover:to-accent-600 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
