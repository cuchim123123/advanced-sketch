import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { UserCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loginAsGuest, loading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    }
  }

  const handleGuestLogin = () => {
    loginAsGuest()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4">
      {/* Decorative orbs */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-300 rounded-full blur-3xl opacity-20"></div>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to continue sketching</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 outline-none transition bg-white"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 outline-none transition bg-white"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-sky-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-sm text-slate-400">or</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Guest Login Button */}
        <button
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
        >
          <UserCircle className="w-5 h-5" />
          Continue as Guest
        </button>

        <p className="text-center mt-6 text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
