import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export const AuthLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()

  const handleBack = () => {
    // If user is logged in, go to dashboard
    // Otherwise, go back in history or to home
    if (token) {
      navigate('/dashboard')
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  // Don't show back button on login page if not authenticated
  const showBackButton = token || location.pathname !== '/login'

  return (
    <div 
      className="flex items-center justify-center min-h-screen py-4 sm:py-8 px-4 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-y-auto"
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-purple-800/80 to-indigo-900/80"></div>
      
      {/* Decorative blurs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      
      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          <span className="font-medium hidden xs:inline">{token ? 'Back to Dashboard' : 'Back'}</span>
          <span className="font-medium xs:hidden">Back</span>
        </button>
      )}
      
      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
