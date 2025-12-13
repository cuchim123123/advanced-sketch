import React, { useEffect, useState } from 'react'
import { Users, Folder, Activity, TrendingUp } from 'lucide-react'
import api from '@/services/api'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRooms: 0,
    activeRooms: 0,
    guestUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersRes, roomsRes] = await Promise.all([
        api.get('/admin/users/stats'),
        api.get('/admin/rooms/stats')
      ])
      
      setStats({
        totalUsers: usersRes.data?.data?.total || 0,
        totalRooms: roomsRes.data?.data?.total || 0,
        activeRooms: roomsRes.data?.data?.active || 0,
        guestUsers: usersRes.data?.data?.guests || 0
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: '+12%'
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Folder,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      change: '+8%'
    },
    {
      title: 'Active Rooms',
      value: stats.activeRooms,
      icon: Activity,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      change: '+23%'
    },
    {
      title: 'Guest Users',
      value: stats.guestUsers,
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '+5%'
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '1rem' }}>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'white',
          marginBottom: '0.5rem'
        }}>
          Dashboard Overview
        </h1>
        <p style={{ 
          fontSize: '1rem', 
          color: 'rgba(255, 255, 255, 0.6)' 
        }}>
          Welcome back! Here's what's happening with your application.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: stat.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={24} color="white" />
                </div>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px'
                }}>
                  {stat.change}
                </span>
              </div>
              <div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '0.5rem'
                }}>
                  {stat.title}
                </p>
                <h2 style={{ 
                  fontSize: '2rem', 
                  fontWeight: '700', 
                  color: 'white',
                  margin: 0
                }}>
                  {stat.value.toLocaleString()}
                </h2>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem'
      }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          color: 'white',
          marginBottom: '1.5rem'
        }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {['View All Users', 'View All Rooms', 'System Settings'].map((action) => (
            <button
              key={action}
              style={{
                padding: '0.875rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
