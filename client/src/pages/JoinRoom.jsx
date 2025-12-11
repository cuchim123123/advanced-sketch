import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'

export default function JoinRoom() {
  const { code } = useParams()
  const [password, setPassword] = useState('')
  const [roomInfo, setRoomInfo] = useState(null)
  const { joinRoom, getRoom, loading, error } = useRoomStore()
  const { token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      // Store intended destination and redirect to login
      sessionStorage.setItem('redirectAfterLogin', `/join/${code}`)
      navigate('/login')
      return
    }

    // Fetch room info
    getRoom(code).then((result) => {
      if (result.success) {
        setRoomInfo(result.room)
      }
    })
  }, [code, token])

  const handleJoin = async (e) => {
    e.preventDefault()
    const result = await joinRoom(code, password)
    if (result.success) {
      navigate(`/room/${code}`)
    }
  }

  if (!token) {
    return null // Redirecting to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4 relative">
      {/* Decorative orbs */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-300 rounded-full blur-3xl opacity-20"></div>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Join Sketch Room</h1>
          <p className="text-slate-500 mt-2">Room Code: {code}</p>
        </div>

        {loading && !roomInfo ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading room info...</p>
          </div>
        ) : roomInfo ? (
          <div>
            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
              <h2 className="font-semibold text-lg text-slate-800">{roomInfo.name}</h2>
              <p className="text-sm text-slate-500">
                Created by {roomInfo.owner?.username || 'Unknown'}
              </p>
              {roomInfo.isPasswordProtected && (
                <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200">
                  🔒 Password Protected
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              {roomInfo.isPasswordProtected && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Room Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 outline-none bg-white"
                    placeholder="Enter room password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-4 text-slate-500 hover:text-slate-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Room not found</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sky-600 hover:underline"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
