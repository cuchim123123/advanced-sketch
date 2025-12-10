import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const verifyEmail = async () => {
      const uid = searchParams.get('uid')
      const token = searchParams.get('token')

      if (!uid || !token) {
        setStatus('error')
        setMessage('Invalid verification link. Please check your email and try again.')
        return
      }

      try {
        const res = await fetch(`/api/auth/verify-email?uid=${uid}&token=${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setMessage(data.message || 'Your email has been successfully verified!')

          // Auto login if token is provided
          if (data.data?.user && data.data?.token) {
            setUser(data.data.user, data.data.token)
          }

          // Start countdown to redirect
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer)
                navigate('/dashboard')
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return () => clearInterval(timer)
        } else {
          setStatus('error')
          setMessage(data.message || 'Verification failed. The link may have expired.')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('An error occurred during verification. Please try again later.')
      }
    }

    verifyEmail()
  }, [searchParams, navigate, setUser])

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg glow-purple">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Verifying Your Email</h2>
            <p className="text-white/70">Please wait while we verify your email address...</p>
          </>
        )

      case 'success':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full shadow-lg glow-green">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Email Verified!</h2>
            <p className="text-white/70 mb-4">{message}</p>
            <div className="glass-strong border border-green-500/30 rounded-xl p-4 mb-6">
              <p className="text-green-300 text-sm">
                You will be redirected to the dashboard in <span className="font-bold text-green-200">{countdown}</span> seconds...
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 shadow-lg glow-purple transition-all flex items-center justify-center gap-2"
            >
              Go to Dashboard Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )

      case 'error':
        return (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-red-500 to-rose-500 rounded-full shadow-lg">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Verification Failed</h2>
            <p className="text-white/70 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 shadow-lg glow-purple transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full glass-button text-white/80 hover:text-white font-semibold py-3 rounded-xl transition-all"
              >
                Go to Login
              </button>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb orb-purple w-80 h-80 -top-40 -right-40 animate-float" />
      <div className="orb orb-cyan w-64 h-64 bottom-20 -left-32 animate-float" style={{ animationDelay: '-3s' }} />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="glass rounded-2xl border border-white/10 p-8 text-center">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
