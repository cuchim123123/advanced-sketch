import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/services/config'
import { Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store'
import { AuthLayout } from '../common/AuthLayout'
import { LoadingSpinner } from '@/components/common'

const Login = () => {
  const navigate = useNavigate()
  const { setUser, user, token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (token && user) {
      navigate('/')
    }
  }, [navigate, token, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.target)
    const emailOrPhoneOrUsername = formData.get('email')?.trim()
    const password = formData.get('password')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: 'include',
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ emailOrPhoneOrUsername, password })
      })

      const data = await res.json()

      // Check if email verification is required
      if (res.status === 403 && data.requiresVerification) {
        // Redirect to verify-email-prompt page
        navigate(`/verify-email-prompt?email=${encodeURIComponent(emailOrPhoneOrUsername)}`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.message || "Login failed")
      }

      // Successful login
      if (data.data?.user) {
        // Update auth store with user and token
        setUser(data.data.user, data.data.token)

        toast.success("Login successful!", {
          position: "top-center",
        })

        // Navigate to dashboard after short delay
        setTimeout(() => navigate("/"), 500)
      } else {
        throw new Error("Invalid response from server")
      }

    } catch (err) {
      toast.error(err.message, {
        position: "top-center",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotPasswordLoading(true)

    const formData = new FormData(e.target)
    const email = formData.get('forgotEmail')

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message || "Failed to send reset link")

      toast.success("Password reset link sent to your email!", {
        position: "top-center",
        duration: 5000,
      })

      setShowForgotPassword(false)

    } catch (err) {
      toast.error(err.message, {
        position: "top-center",
      })
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <AuthLayout>
      {showForgotPassword ? (
        // Forgot Password Form
        <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
          <CardHeader className="space-y-4 pb-6">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
            <div className="flex justify-center">
              <div className="p-4 bg-sky-100 rounded-full">
                <Mail className="w-12 h-12 text-sky-600" />
              </div>
            </div>
            <CardTitle className="text-3xl text-center font-bold text-slate-800">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-slate-600 text-base">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className='space-y-2'>
                <Label htmlFor="forgotEmail" className="text-sm font-semibold text-slate-800">Email Address</Label>
                <Input
                  id="forgotEmail"
                  name="forgotEmail"
                  type="email"
                  placeholder="john@example.com"
                  className="h-11 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                size="lg"
              >
                {forgotPasswordLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" variant="button" />
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        // Normal Login Form
        <Card className="w-full max-w-[500px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
          <CardHeader className="space-y-2 pb-4 sm:pb-6">
            <CardTitle className="text-3xl text-center font-bold text-slate-800">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              Sign in to continue to Advanced Sketch
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className='space-y-2'>
                <Label htmlFor="email" className="text-sm font-semibold text-slate-800">Email / Phone / Username</Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="john@example.com or username"
                  className="h-11 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-sky-600 hover:text-sky-700 hover:underline font-medium block mt-2 ml-auto"
                >
                  Forgot password?
                </button>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" variant="button" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6 border-t border-slate-200">
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-sm text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                useAuthStore.getState().loginAsGuest()
                toast.success("Welcome, Guest!", { position: "top-center" })
                navigate("/")
              }}
              className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Continue as Guest
            </Button>

            <p className="text-sm text-center text-slate-600">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
                Create one now
              </Link>
            </p>
          </CardFooter>
        </Card>
      )}
    </AuthLayout>
  )
}

export default Login

