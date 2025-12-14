import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, UserCircle, LogIn, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function DashboardHeader() {
  const { user, logout, isGuest } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="glass border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center glow-purple">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">CoPad</h1>
        </div>
        <div className="flex items-center gap-4">
          {isGuest && (
            <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-300">
              Guest
            </span>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="glass-button px-4 py-2 flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-sm font-bold text-white">
              {isGuest ? <UserCircle className="w-5 h-5" /> : (user?.username?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <span className="hidden sm:inline">{user?.username}</span>
          </button>
          {isGuest ? (
            <Link
              to="/login"
              className="glass-button px-4 py-2 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          ) : (
            <button
              onClick={logout}
              className="glass-button px-4 py-2 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
