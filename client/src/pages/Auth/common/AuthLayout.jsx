import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const AuthLayout = ({ children }) => {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-screen py-4 sm:py-8 px-4 animated-gradient relative overflow-y-auto">
      {/* Decorative orbs */}
      <div className="absolute top-20 -left-20 w-72 h-72 bg-sky-300 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-20 -right-20 w-72 h-72 bg-emerald-300 rounded-full blur-3xl opacity-20"></div>
      
      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-600 hover:text-slate-800 bg-white/80 hover:bg-white backdrop-blur-sm rounded-lg transition-all duration-200 group border border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
        <span className="font-medium hidden xs:inline">Back to Home</span>
        <span className="font-medium xs:hidden">Back</span>
      </button>
      
      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
