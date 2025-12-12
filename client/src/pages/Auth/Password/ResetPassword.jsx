import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Check, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { AuthLayout, AuthCard, PasswordInput } from '../common'
import { useToast } from '@/components/Toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  
  const userId = searchParams.get('uid')
  const token = searchParams.get('token')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const invalidLink = !userId || !token

  const checkPasswordStrength = (password) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    }
    const passed = Object.values(checks).filter(Boolean).length
    const strength = (passed / 4) * 100
    return { checks, strength, passed }
  }

  const passwordStrength = newPassword ? checkPasswordStrength(newPassword) : null
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword
  const canSubmit = passwordStrength?.strength === 100 && passwordsMatch

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!canSubmit) {
      toast.error('Please meet all password requirements')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess(true)
      toast.success('Password reset successful!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <AuthCard.Card>
          <AuthCard.Header title="Password Reset Complete" />
          
          <AuthCard.Content>
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
                <p className="text-slate-700">
                  Your password has been successfully reset.
                </p>
                <p className="text-slate-500 text-sm">
                  You can now sign in with your new password.
                </p>
              </div>
            </div>
          </AuthCard.Content>

          <AuthCard.Footer>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Sign In
            </button>
          </AuthCard.Footer>
        </AuthCard.Card>
      </AuthLayout>
    )
  }

  if (invalidLink) {
    return (
      <AuthLayout>
        <AuthCard.Card>
          <AuthCard.Header title="Invalid Link" />
          
          <AuthCard.Content>
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30"></div>
                  <div className="relative p-6 bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-lg">
                    <AlertCircle className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-slate-700">
                  This password reset link is invalid or has expired.
                </p>
                <p className="text-slate-500 text-sm">
                  Please request a new password reset link.
                </p>
              </div>
            </div>
          </AuthCard.Content>

          <AuthCard.Footer>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Request New Link
            </button>
            <Link 
              to="/login" 
              className="block text-center text-slate-600 hover:text-slate-800 text-sm transition"
            >
              Back to Login
            </Link>
          </AuthCard.Footer>
        </AuthCard.Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard.Card>
        <AuthCard.Header 
          title="Reset Password" 
          description="Create a new secure password"
        />
        
        <AuthCard.Content>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-sky-100 rounded-full">
                <Lock className="w-12 h-12 text-sky-600" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  New Password
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                />

                {/* Password Strength Meter */}
                {newPassword && passwordStrength && (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i < passwordStrength.passed
                              ? passwordStrength.strength < 50
                                ? 'bg-red-500'
                                : passwordStrength.strength < 100
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-semibold ${
                      passwordStrength.strength < 50 ? 'text-red-500' :
                      passwordStrength.strength < 100 ? 'text-orange-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.strength < 50 ? 'Weak password' :
                       passwordStrength.strength < 100 ? 'Medium password' :
                       'Strong password'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-slate-400'}`}>
                        {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        12+ characters
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-slate-400'}`}>
                        {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-slate-400'}`}>
                        {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Lowercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-slate-400'}`}>
                        {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Number
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Confirm Password
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                />
                
                {confirmPassword && (
                  <p className={`text-xs flex items-center gap-1 ${
                    passwordsMatch ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {passwordsMatch ? (
                      <><Check className="w-3 h-3" /> Passwords match</>
                    ) : (
                      <><X className="w-3 h-3" /> Passwords do not match</>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </AuthCard.Content>

        <AuthCard.Footer>
          <p className="text-center text-xs text-slate-500">
            Password must meet all 4 requirements above
          </p>
          <Link 
            to="/login" 
            className="block text-center text-slate-600 hover:text-slate-800 text-sm transition"
          >
            Back to Login
          </Link>
        </AuthCard.Footer>
      </AuthCard.Card>
    </AuthLayout>
  )
}
