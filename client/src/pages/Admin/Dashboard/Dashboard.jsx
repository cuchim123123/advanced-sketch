import React, { useEffect, useState } from 'react'
import { Users, Folder, Activity, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services'

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRooms: 0,
    activeRooms: 0,
    guestUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      gradientClass: 'bg-gradient-to-br from-slate-600 to-slate-700',
      change: '+12%'
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Folder,
      gradientClass: 'bg-gradient-to-br from-slate-600 to-slate-700',
      change: '+8%'
    },
    {
      title: 'Active Rooms',
      value: stats.activeRooms,
      icon: Activity,
      gradientClass: 'bg-gradient-to-br from-slate-600 to-slate-700',
      change: '+23%'
    },
    {
      title: 'Guest Users',
      value: stats.guestUsers,
      icon: TrendingUp,
      gradientClass: 'bg-gradient-to-br from-slate-600 to-slate-700',
      change: '+5%'
    }
  ]

  const quickActions = [
    { label: 'View All Users', route: '/admin/users' },
    { label: 'View All Rooms', route: '/admin/rooms' },
    { label: 'System Settings', route: '/admin/settings' }
  ]

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="spinner mx-auto"></div>
        <p className="text-white/60 mt-4">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-base text-white/60">
          Welcome back! Here's what's happening with your application.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.gradientClass} flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-500 bg-emerald-500/10 py-1 px-3 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-2">
                  {stat.title}
                </p>
                <h2 className="text-3xl font-bold text-white m-0">
                  {stat.value.toLocaleString()}
                </h2>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Quick Actions
        </h3>
        <div className="flex gap-4 flex-wrap">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="py-3.5 px-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white border border-slate-600 rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-[0_8px_20px_rgba(51,65,85,0.4)] hover:from-slate-600 hover:to-slate-700"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
