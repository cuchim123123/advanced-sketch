import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoomStore, useAuthStore } from '@/store'

export default function JoinRoom() {
  const { code } = useParams()
  const [roomInfo, setRoomInfo] = useState(null)
  const { getRoom, loading, error } = useRoomStore()
  const { token, isGuest } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // If not logged in and not a guest, redirect to login
    if (!token && !isGuest) {
      sessionStorage.setItem('redirectAfterLogin', `/room/${code}`)
      navigate('/login')
      return
    }

    // Fetch room info then navigate directly to room
    getRoom(code).then((result) => {
      if (result.success) {
        setRoomInfo(result.room)
        // Auto-navigate to room
        navigate(`/room/${code}`)
      }
    })
  }, [code, token, isGuest, navigate, getRoom])

  if (!token && !isGuest) {
    return null // Redirecting to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4 relative">
      {/* Decorative orbs */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-300 rounded-full blur-3xl opacity-20"></div>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Joining Room</h1>
          <p className="text-slate-500 mt-2">Room Code: {code}</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">Joining room...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sky-600 hover:underline"
            >
              Go to Dashboard
            </button>
          </div>
        ) : !roomInfo ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Room not found</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sky-600 hover:underline"
            >
              Go to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
