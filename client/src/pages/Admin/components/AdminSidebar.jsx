import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Folder, Settings, LogOut, Sparkles, Search, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store'

const AdminSidebar = ({ onNavigate }) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const navigationTabs = [
    { title: 'Dashboard', route: '/admin', icon: LayoutDashboard },
    { title: 'Users', route: '/admin/users', icon: Users },
    { title: 'Rooms', route: '/admin/rooms', icon: Folder },
    { title: 'Settings', route: '/admin/settings', icon: Settings },
  ]

  const handleTabClick = (route) => {
    navigate(route)
    onNavigate?.()
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (route) => {
    if (route === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(route)
  }

  const filteredTabs = navigationTabs.filter((tab) =>
    tab.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
  )

  return (
    <div className="admin-sidebar-shell">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white m-0">Admin Panel</h1>
            <p className="text-sm text-white/60 m-0">Advanced Sketch</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" 
          />
          <input
            type="text"
            placeholder="Search navigation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2.5 px-3 pl-10 bg-white/5 border border-white/10 rounded-[10px] text-sm text-white outline-none transition-all duration-200 focus:bg-white/10 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 pb-4">
        <div className="flex flex-col gap-1.5">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.route)
            return (
              <button
                key={tab.route}
                onClick={() => handleTabClick(tab.route)}
                className={`
                  flex items-center gap-3 py-3.5 px-4 border-none rounded-[10px] text-[0.9375rem] cursor-pointer transition-all duration-200 text-left w-full
                  ${active 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold' 
                    : 'bg-transparent text-white/70 font-medium hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                <span>{tab.title}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Account Section */}
      <div className="px-6 py-4 border-t border-white/10 mt-auto">
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center gap-3 w-full p-3 bg-white/5 border border-white/10 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10"
          >
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white mb-0.5">
                {user?.username || 'Admin'}
              </div>
              <div className="text-xs text-white/50">
                Administrator
              </div>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-white/50 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>

          {showAccountMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-[10px] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] overflow-hidden z-50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full py-3.5 px-4 bg-transparent text-red-400 border-none text-sm font-medium cursor-pointer transition-all duration-200 text-left hover:bg-red-400/10"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar
