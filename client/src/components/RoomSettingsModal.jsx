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
  const [passwordAction, setPasswordAction] = useState('keep') // 'keep', 'remove', 'change'
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (room) {
      setName(room.name || '')
      setIsPublic(room.isPublic || false)
      setMaxParticipants(room.maxParticipants || 10)
      setPasswordAction('keep')
      setNewPassword('')
    }
  }, [room, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const updates = {
      name,
      isPublic,
      maxParticipants
    }

    if (passwordAction === 'remove') {
      updates.removePassword = true
    } else if (passwordAction === 'change' && newPassword) {
      updates.password = newPassword
    }

    await onSave(updates)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Room Settings
          </h2>
          <button
            onClick={onClose}
            className="glass-button p-2 text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 glass-input text-white"
              required
              maxLength={100}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ${
                  !isPublic 
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300' 
                    : 'border-white/20 text-white/50 hover:bg-white/5'
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
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' 
                    : 'border-white/20 text-white/50 hover:bg-white/5'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">
              {isPublic 
                ? 'Anyone can discover and join this room' 
                : 'Only accessible via invite link or code'}
            </p>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              <Users className="w-4 h-4 inline mr-1 text-cyan-400" />
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-3 glass-input text-white"
            />
          </div>

          {/* Password Settings */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Password Protection
            </label>
            <div className="space-y-2 text-white/60">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="password"
                  checked={passwordAction === 'keep'}
                  onChange={() => setPasswordAction('keep')}
                  className="text-purple-500 bg-white/10 border-white/20"
                />
                <span className="text-sm">
                  {room?.isPasswordProtected ? 'Keep current password' : 'No password'}
                </span>
              </label>
              
              {room?.isPasswordProtected && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="password"
                    checked={passwordAction === 'remove'}
                    onChange={() => setPasswordAction('remove')}
                    className="text-purple-500 bg-white/10 border-white/20"
                  />
                  <span className="text-sm">Remove password</span>
                </label>
              )}
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="password"
                  checked={passwordAction === 'change'}
                  onChange={() => setPasswordAction('change')}
                  className="text-purple-500 bg-white/10 border-white/20"
                />
                <span className="text-sm">
                  {room?.isPasswordProtected ? 'Change password' : 'Set password'}
                </span>
              </label>
              
              {passwordAction === 'change' && (
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 glass-input text-white mt-2"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
