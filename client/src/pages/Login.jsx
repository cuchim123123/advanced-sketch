import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { Mail, AlertCircle, Loader2, Shield, UserCircle } from 'lucide-react'
import { AuthLayout, AuthCard, AuthHeader, AuthContent, AuthFooter, PasswordInput } from '../components/auth'

export default function Login() {
  const navigate = useNavigate()
  const { login, loginAsGuest, isGuest } = useAuthStore()
  const toast = useToast()
  
  const [loading, setLoading] = useState(false)
  const [showOtpForm, setShowOtpForm] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [credentials, setCredentials] = useState({ emailOrUsername: '', password: '' })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const otpInputRefs = useRef([])

  // Redirect if already logged in (but NOT if guest - they can create account)
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const authStorage = localStorage.getItem('auth-storage')
    const isGuestUser = authStorage && JSON.parse(authStorage)?.state?.isGuest
    
    // Only redirect if logged in AND not a guest
    if (token && !isGuestUser) {
      navigate('/dashboard')
    }
  }, [navigate])

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('')
    if (pastedData.every(char => /^\d$/.test(char))) {
      setOtp(pastedData.concat(Array(6 - pastedData.length).fill('')))
      otpInputRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(credentials.emailOrUsername, credentials.password)
      
      if (!result.success) {
        // Check if OTP is required
        if (result.needOtp) {
          setShowOtpForm(true)
          toast.warning('Multiple failed attempts detected. Please verify with OTP.')
        } else {
          setError(result.message || 'Login failed')
        }
        return
      }

      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOtpLoading(true)

    const otpCode = otp.join('')

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits')
      setOtpLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhoneOrUsername: credentials.emailOrUsername,
          otp: otpCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed')
      }

      toast.success('OTP verified! You can now login.')
      setShowOtpForm(false)
      setOtp(['', '', '', '', '', ''])
      // Allow user to retry login
    } catch (err) {
      setError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      const response = await fetch('/api/auth/resend-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhoneOrUsername: credentials.emailOrUsername })
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('OTP sent to your email')
      } else {
        toast.error(data.message || 'Failed to resend OTP')
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <AuthLayout>
      <AuthCard>
        {!showOtpForm ? (
          <>
            <AuthHeader 
              title="Welcome Back" 
              description="Sign in to continue sketching"
            />
            
            <AuthContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {/* Email/Username Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                    <input
                      type="text"
                      value={credentials.emailOrUsername}
                      onChange={(e) => setCredentials({ ...credentials, emailOrUsername: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none transition backdrop-blur-sm"
                      placeholder="Enter your email or username"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                    Password
                  </label>
                  <PasswordInput
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Enter your password"
                  />
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-white/80 hover:text-white transition [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-white/60">or</span>
                  </div>
                </div>

                {/* Guest Login Button */}
                <button
                  type="button"
                  onClick={() => {
                    loginAsGuest()
                    toast.success('Welcome, Guest! You can sketch but some features are limited.')
                    // Navigate immediately - state is already set synchronously
                    navigate('/dashboard', { replace: true })
                  }}
                  className="w-full h-12 glass-button text-white/90 hover:text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <UserCircle className="w-5 h-5" />
                  Continue as Guest
                </button>
              </form>
            </AuthContent>
          </>
        ) : (
          <>
            <AuthHeader 
              title="Security Verification" 
              description="Enter the code sent to your email"
            />
            
            <AuthContent>
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {/* Security Notice */}
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">OTP Required</p>
                    <p className="text-xs text-white/80 mt-1 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                      We've sent a 6-digit code to your email for security verification.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {/* OTP Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 text-center bg-white/10 border-2 border-white/20 rounded-lg font-semibold text-xl text-white focus:border-white/50 focus:ring-2 focus:ring-white/20 outline-none transition backdrop-blur-sm"
                        maxLength="1"
                        inputMode="numeric"
                      />
                    ))}
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {otpLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>

                {/* Resend Button */}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="w-full text-white/80 hover:text-white hover:bg-white/10 font-semibold py-2 rounded-lg transition"
                >
                  Didn't receive code? Resend
                </button>

                {/* Back to Login */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpForm(false)
                    setOtp(['', '', '', '', '', ''])
                    setError('')
                  }}
                  className="w-full text-white/60 hover:text-white/80 text-sm py-2 transition"
                >
                  ← Back to login
                </button>
              </form>
            </AuthContent>
          </>
        )}

        <AuthFooter>
          <p className="text-center text-white/90 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-semibold hover:underline [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]">
              Sign up
            </Link>
          </p>
        </AuthFooter>
      </AuthCard>
    </AuthLayout>
  )
}
