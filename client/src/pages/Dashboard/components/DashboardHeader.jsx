import { Link, useNavigate } from 'react-router-dom'
import { UserCircle, LogIn, LogOut, ChevronDown, User, ShieldUser } from 'lucide-react'
import { useAuthStore } from '@/store'
import { useState } from 'react'

export default function DashboardHeader() {
  const { user, logout, isGuest } = useAuthStore()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <header className="glass border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-500 px-2 py-1 shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-green-600 hover:shadow-xl hover:-translate-y-0.5 m-0">
            CoPad
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isGuest && (
            <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-300">
              Guest
            </span>
          )}
          
          {/* User Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="glass-button px-4 py-2 flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-sm font-bold text-white">
                {isGuest ? <UserCircle className="w-5 h-5" /> : (user?.username?.charAt(0)?.toUpperCase() || 'U')}
              </div>
              <span className="hidden sm:inline">{user?.username}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-lg z-50">
                  {isGuest ? (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In</span>
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Create Account</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <UserCircle className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors border-b border-slate-100"
                        >
                          <ShieldUser className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
