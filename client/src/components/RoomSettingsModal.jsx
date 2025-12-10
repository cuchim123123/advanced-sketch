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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Room Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
              maxLength={100}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${
                  !isPublic 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition ${
                  isPublic 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPublic 
                ? 'Anyone can discover and join this room' 
                : 'Only accessible via invite link or code'}
            </p>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Max Participants
            </label>
            <input
              type="number"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Password Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Protection
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="password"
                  checked={passwordAction === 'keep'}
                  onChange={() => setPasswordAction('keep')}
                  className="text-indigo-600"
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
                    className="text-indigo-600"
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
                  className="text-indigo-600"
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
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mt-2"
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
