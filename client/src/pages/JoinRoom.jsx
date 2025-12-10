import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, Lock, LogIn, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen animated-gradient relative overflow-hidden flex items-center justify-center p-4">
      {/* Floating orbs */}
      <div className="orb orb-purple w-80 h-80 -top-40 -right-40 animate-float" />
      <div className="orb orb-cyan w-64 h-64 bottom-20 -left-32 animate-float" style={{ animationDelay: '-3s' }} />

      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-4 left-4 z-20 glass-button p-2.5 text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="glass rounded-2xl w-full max-w-md p-8 border border-white/10 animate-scale-in relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg glow-purple">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join Sketch Room</h1>
          <p className="text-white/60 mt-2 font-mono">Room Code: <span className="text-purple-400">{code}</span></p>
        </div>

        {loading && !roomInfo ? (
          <div className="text-center py-8">
            <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white/60 mt-4">Loading room info...</p>
          </div>
        ) : roomInfo ? (
          <div>
            <div className="glass-strong rounded-xl p-4 mb-6 border border-white/10">
              <h2 className="font-semibold text-lg text-white">{roomInfo.name}</h2>
              <p className="text-sm text-white/60">
                Created by {roomInfo.owner?.username || 'Unknown'}
              </p>
              {roomInfo.isPasswordProtected && (
                <span className="inline-flex items-center gap-1.5 mt-2 text-xs bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-lg border border-yellow-500/30">
                  <Lock className="w-3 h-3" />
                  Password Protected
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-300 p-3 rounded-xl text-sm mb-4 border border-red-500/30">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              {roomInfo.isPasswordProtected && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Room Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl text-white placeholder-white/40 border border-white/10 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    placeholder="Enter room password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg glow-purple"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Join Room
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-4 text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Room not found</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
