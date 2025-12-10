import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { AuthLayout, AuthCard, AuthHeader, AuthContent, AuthFooter } from '../components/auth'
import { useToast } from '../components/Toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Please enter your email or username')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reset link')
      }

      setEmailSent(true)
      toast.success('Reset link sent! Check your email.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthHeader title="Check Your Email" />
          
          <AuthContent>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
                    <CheckCircle className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-white/95 [text-shadow:_0_1px_4px_rgb(0_0_0_/_30%)]">
                  We've sent a password reset link to
                </p>
                <p className="text-white font-semibold [text-shadow:_0_1px_4px_rgb(0_0_0_/_40%)]">
                  {email}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-white/20">
                <p className="text-sm text-white/90 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                  <strong>Next steps:</strong>
                </p>
                <ol className="text-sm text-white/80 space-y-2 list-decimal list-inside [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                  <li>Check your email inbox</li>
                  <li>Click the reset link (expires in 15 minutes)</li>
                  <li>Create a new password</li>
                </ol>
              </div>

              <p className="text-center text-sm text-white/60 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                Didn't receive it? Check your spam folder.
              </p>
            </div>
          </AuthContent>

          <AuthFooter>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all"
            >
              Back to Login
            </button>
          </AuthFooter>
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader 
          title="Reset Password" 
          description="Enter your email and we'll send you a reset link"
        />
        
        <AuthContent>
          <div className="space-y-6">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>

            <div className="flex justify-center">
              <div className="p-4 bg-blue-500/20 rounded-full backdrop-blur-sm">
                <Mail className="w-12 h-12 text-white" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none transition backdrop-blur-sm"
                    placeholder="Enter your email or username"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        </AuthContent>

        <AuthFooter>
          <p className="text-center text-white/90 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
            Remember your password?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">
              Sign in
            </Link>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthLayout>
  )
}
