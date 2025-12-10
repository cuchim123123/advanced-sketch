import React from 'react'

export const AuthCard = ({ children, className = "" }) => {
  return (
    <div className={`w-full max-w-[500px] mx-auto glass-card animate-scale-in ${className}`}>
      {children}
    </div>
  )
}

export const AuthHeader = ({ title, subtitle }) => {
  return (
    <div className="space-y-2 pb-4 sm:pb-6 px-6 pt-6">
      <h1 className="text-2xl sm:text-3xl text-center font-bold gradient-text">
        {title}
      </h1>
      {subtitle && (
        <p className="text-center text-sm sm:text-base text-white/60">
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
    <div className="flex flex-col gap-2 pt-6 pb-6 px-6 border-t border-white/10">
      {children}
    </div>
  )
}

export default AuthCard
