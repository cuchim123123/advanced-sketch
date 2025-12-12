import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/Toast'
import { User, Lock, ArrowLeft, Check, Sparkles, UserCircle, LogIn } from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, updateProfile, changePassword, loading, isGuest } = useAuthStore()

  const [activeTab, setActiveTab] = useState('profile') // 'profile' or 'password'
  
  // Profile form
  const [username, setUsername] = useState(user?.username || '')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    
    if (isGuest) {
      toast.error('Guests cannot update profile. Please create an account.')
      return
    }
    
    const updates = {}
    if (username !== user?.username) updates.username = username
    if (avatar !== user?.avatar) updates.avatar = avatar || null

    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save')
      return
    }

    const result = await updateProfile(updates)
    if (result.success) {
      toast.success('Profile updated successfully')
    } else {
      toast.error(result.error || 'Failed to update profile')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (isGuest) {
      toast.error('Guests cannot change password. Please create an account.')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    const result = await changePassword(currentPassword, newPassword)
    if (result.success) {
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      toast.error(result.error || 'Failed to change password')
    }
  }

  // Guest view - prompt to create account
  if (isGuest) {
    return (
      <div className="min-h-screen animated-gradient relative overflow-hidden">
        {/* Floating orbs */}
        <div className="orb orb-purple w-80 h-80 -top-40 -right-40 animate-float" />
        <div className="orb orb-cyan w-64 h-64 bottom-20 -left-32 animate-float" style={{ animationDelay: '-3s' }} />

        {/* Header */}
        <header className="glass border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="glass-button p-2 text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Account Settings</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-200 shadow-lg animate-fade-in text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center border-2 border-slate-200">
              <UserCircle className="w-10 h-10 text-slate-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">You're a Guest</h2>
            <p className="text-slate-500 mb-6">
              Guest accounts have limited features. Create an account to save your settings, access your rooms from any device, and more!
            </p>

            <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
              <p className="text-amber-700 text-sm">
                ⚠️ Your sketches in rooms will not be saved to your account as a guest.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="px-6 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-xl hover:from-sky-600 hover:to-emerald-600 font-medium shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Create Account
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 glass-button text-slate-600 hover:text-slate-800 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen animated-gradient relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb orb-purple w-80 h-80 -top-40 -right-40 animate-float" />
      <div className="orb orb-cyan w-64 h-64 bottom-20 -left-32 animate-float" style={{ animationDelay: '-3s' }} />

      {/* Header */}
      <header className="glass border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="glass-button p-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Account Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg'
                : 'glass-button text-slate-600 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg'
                : 'glass-button text-slate-600 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Password
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg animate-fade-in">
            <h2 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-500" />
              Profile Information
            </h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center text-3xl font-bold text-slate-600 overflow-hidden border-2 border-slate-200 shadow-lg">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                  ) : null}
                  <span style={{ display: avatar ? 'none' : 'block' }}>
                    {username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_]+$"
                  title="Username must be alphanumeric (letters, numbers, underscores)"
                />
                <p className="text-xs text-slate-500 mt-2">
                  3-30 characters, letters, numbers and underscores only
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl text-slate-500 border border-slate-200 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Email cannot be changed
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-xl hover:from-sky-600 hover:to-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-300"
              >
                {loading ? 'Saving...' : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 shadow-lg animate-fade-in">
            <h2 className="text-lg font-semibold mb-6 text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-sky-500" />
              Change Password
            </h2>
            
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  required
                  minLength={6}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Minimum 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || newPassword !== confirmPassword}
                className="w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl hover:from-sky-600 hover:to-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg transition-all duration-300"
              >
                {loading ? 'Changing...' : (
                  <>
                    <Lock className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
