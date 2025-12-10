import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const AuthLayout = ({ children }) => {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 overflow-hidden">
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-purple-800/80 to-indigo-900/80"></div>
      
      {/* Decorative blurs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      
      {/* Back Button - always visible */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 px-4 py-2.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 group border border-white/20 hover:border-white/30 shadow-lg"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
        <span className="font-medium">Back</span>
      </button>
      
      {/* Content - scrollable container if needed */}
      <div className="relative z-10 w-full max-h-screen overflow-y-auto py-8 px-4 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout
