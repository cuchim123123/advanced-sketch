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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Join Sketch Room</h1>
          <p className="text-gray-500 mt-2">Room Code: {code}</p>
        </div>

        {loading && !roomInfo ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading room info...</p>
          </div>
        ) : roomInfo ? (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-lg">{roomInfo.name}</h2>
              <p className="text-sm text-gray-500">
                Created by {roomInfo.owner?.username || 'Unknown'}
              </p>
              {roomInfo.isPasswordProtected && (
                <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                  🔒 Password Protected
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              {roomInfo.isPasswordProtected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter room password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-4 text-gray-500 hover:text-gray-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Room not found</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-indigo-600 hover:underline"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
