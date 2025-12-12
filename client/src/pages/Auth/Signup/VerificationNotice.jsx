import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Shield, CheckCircle } from 'lucide-react'
import { AuthCard, AuthHeader, AuthContent, AuthFooter } from '../common'

export const VerificationNotice = ({ userEmail }) => {
  const [countdown, setCountdown] = useState(900) // 15 minutes
  const navigate = useNavigate()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [countdown])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AuthCard>
      <AuthHeader title="Verify Your Email" />
      
      <AuthContent>
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
                <Mail className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-slate-600">
              We've sent a verification link to
            </p>
            <p className="text-slate-800 font-semibold">
              {userEmail}
            </p>
          </div>

          <div className="bg-sky-50 rounded-xl p-6 space-y-4 border border-sky-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">1</div>
              <div>
                <p className="font-semibold text-slate-800">Check your inbox</p>
                <p className="text-sm text-slate-600">Open the email we just sent you</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">2</div>
              <div>
                <p className="font-semibold text-slate-800">Click the verification link</p>
                <p className="text-sm text-slate-600">This will activate your account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">3</div>
              <div>
                <p className="font-semibold text-slate-800">Start sketching!</p>
                <p className="text-sm text-slate-600">You'll be redirected to login</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">
              Link expires in <span className="font-mono font-semibold text-slate-800">{formatTime(countdown)}</span>
            </span>
          </div>

          <p className="text-center text-sm text-slate-500">
            Didn't receive it? Check your spam folder.
          </p>
        </div>
      </AuthContent>

      <AuthFooter>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all"
        >
          Go to Login
        </button>
      </AuthFooter>
    </AuthCard>
  )
}

export default VerificationNotice
