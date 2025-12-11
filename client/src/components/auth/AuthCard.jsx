import React from 'react'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export const AuthCard = ({ children, className = "" }) => {
  return (
    <Card className={`w-full max-w-[500px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500 ${className}`}>
      {children}
    </Card>
  )
}

export const AuthHeader = ({ title, subtitle }) => {
  return (
    <CardHeader className="space-y-2 pb-4 sm:pb-6">
      <CardTitle className="text-2xl sm:text-3xl text-center font-bold text-slate-800">
        {title}
      </CardTitle>
      {subtitle && (
        <CardDescription className="text-center text-sm sm:text-base text-slate-600">
          {subtitle}
        </CardDescription>
      )}
    </CardHeader>
  )
}

export const AuthContent = ({ children }) => {
  return <CardContent>{children}</CardContent>
}

export const AuthFooter = ({ children }) => {
  return (
    <CardFooter className="flex flex-col gap-2 pt-6 border-t border-slate-200">
      {children}
    </CardFooter>
  )
}

export default AuthCard
