import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { AuthLayout, AuthCard } from '../common'

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
          // Check if email is already verified - treat as success
          if (data.message?.toLowerCase().includes('already verified')) {
            setStatus('success')
            setMessage('Your email is already verified! You can login now.')
            
            // Redirect to login after countdown
            const timer = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(timer)
                  navigate('/login')
                  return 0
                }
                return prev - 1
              })
            }, 1000)
            
            return () => clearInterval(timer)
          }
          
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
          <AuthCard.Content>
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-sky-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-full shadow-lg">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Verifying Your Email</h2>
                <p className="text-slate-600">Please wait while we verify your email address...</p>
              </div>
            </div>
          </AuthCard.Content>
        )

      case 'success':
        return (
          <>
            <AuthCard.Content>
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                    <div className="relative p-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full shadow-lg">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">Email Verified!</h2>
                  <p className="text-slate-600">{message}</p>
                </div>
                <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                  <p className="text-green-700 text-sm">
                    You will be redirected to the dashboard in <span className="font-bold text-green-800">{countdown}</span> seconds...
                  </p>
                </div>
              </div>
            </AuthCard.Content>
            <AuthCard.Footer>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-semibold py-3 rounded-xl hover:from-sky-600 hover:to-emerald-600 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </AuthCard.Footer>
          </>
        )

      case 'error':
        return (
          <>
            <AuthCard.Content>
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                    <div className="relative p-6 bg-gradient-to-br from-red-500 to-rose-500 rounded-full shadow-lg">
                      <XCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">Verification Failed</h2>
                  <p className="text-slate-600">{message}</p>
                </div>
              </div>
            </AuthCard.Content>
            <AuthCard.Footer>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-semibold py-3 rounded-xl hover:from-sky-600 hover:to-emerald-600 shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full glass-button text-slate-600 hover:text-slate-800 font-semibold py-3 rounded-xl transition-all"
                >
                  Go to Login
                </button>
              </div>
            </AuthCard.Footer>
          </>
        )

      default:
        return null
    }
  }

  return (
    <AuthLayout>
      <AuthCard.Card>
        {renderContent()}
      </AuthCard.Card>
    </AuthLayout>
  )
}
