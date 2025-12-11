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
                <p className="text-slate-600">
                  We've sent a password reset link to
                </p>
                <p className="text-slate-800 font-semibold">
                  {email}
                </p>
              </div>

              <div className="bg-sky-50 rounded-xl p-4 space-y-3 border border-sky-200">
                <p className="text-sm text-slate-700">
                  <strong>Next steps:</strong>
                </p>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Check your email inbox</li>
                  <li>Click the reset link (expires in 15 minutes)</li>
                  <li>Create a new password</li>
                </ol>
              </div>

              <p className="text-center text-sm text-slate-500">
                Didn't receive it? Check your spam folder.
              </p>
            </div>
          </AuthContent>

          <AuthFooter>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all"
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
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>

            <div className="flex justify-center">
              <div className="p-4 bg-sky-100 rounded-full">
                <Mail className="w-12 h-12 text-sky-600" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 outline-none transition"
                    placeholder="Enter your email or username"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <p className="text-center text-slate-600">
            Remember your password?{' '}
            <Link to="/login" className="text-sky-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthLayout>
  )
}
