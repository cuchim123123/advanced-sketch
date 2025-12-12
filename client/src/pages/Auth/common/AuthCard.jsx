import React from 'react'

export const AuthCard = ({ children, className = "" }) => {
  return (
    <div className={`w-full max-w-[500px] mx-auto bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in duration-500 ${className}`}>
      {children}
    </div>
  )
}

export const AuthHeader = ({ title, subtitle }) => {
  return (
    <div className="space-y-2 p-6 pb-4 sm:pb-6 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm sm:text-base text-slate-600">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export const AuthContent = ({ children }) => {
  return <div className="px-6 pb-6">{children}</div>
}

export const AuthFooter = ({ children }) => {
  return (
    <div className="flex flex-col gap-2 p-6 pt-6 border-t border-slate-200">
      {children}
    </div>
  )
}

export default AuthCard
