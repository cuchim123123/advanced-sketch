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
      <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: 'white',
              margin: 0 
            }}>Admin Panel</h1>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0 
            }}>Advanced Sketch</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)'
            }} 
          />
          <input
            type="text"
            placeholder="Search navigation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem 0.625rem 2.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              color: 'white',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)'
              e.target.style.borderColor = '#a855f7'
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)'
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '0 1rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {filteredTabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.route)
            return (
              <button
                key={tab.route}
                onClick={() => handleTabClick(tab.route)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: active ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' : 'transparent',
                  color: active ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: active ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.target.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.target.style.background = 'transparent'
                    e.target.style.color = 'rgba(255, 255, 255, 0.7)'
                  }
                }}
              >
                <Icon size={20} />
                <span>{tab.title}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Account Section */}
      <div style={{ 
        padding: '1rem 1.5rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: 'auto'
      }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: 'white',
                marginBottom: '2px'
              }}>
                {user?.username || 'Admin'}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.5)' 
              }}>
                Administrator
              </div>
            </div>
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'rgba(255, 255, 255, 0.5)',
                transform: showAccountMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </button>

          {showAccountMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '0.5rem',
              background: 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              zIndex: 50
            }}>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: 'transparent',
                  color: '#f87171',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(248, 113, 113, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
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
