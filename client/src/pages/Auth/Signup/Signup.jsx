import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/services/config'
import { useAuthStore } from '@/store'
import { AuthLayout } from '../common/AuthLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Check, X, CheckCircle2, Mail } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'

const Signup = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Redirect if already logged in
  useEffect(() => {
    if (token && user) {
      navigate('/')
    }
  }, [token, user, navigate])

  // Password validation - backend requires minimum 6 characters
  const isPasswordValid = formData.password.length >= 6

  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        if (value.length < 3) return 'Username must be at least 3 characters'
        if (value.length > 30) return 'Username must not exceed 30 characters'
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers and underscores'
        return ''
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
        return ''
      case 'password':
        if (value.length < 6) return 'Password must be at least 6 characters'
        return ''
      case 'confirmPassword':
        if (value !== formData.password) return 'Passwords do not match'
        return ''
      default:
        return ''
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
    
    // Also validate confirmPassword when password changes
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = formData.confirmPassword !== value ? 'Passwords do not match' : ''
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors = {}
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key])
      if (error) newErrors[key] = error
    })
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setTouched({ username: true, email: true, password: true, confirmPassword: true })
      toast.error('Please fix all validation errors')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        // Set field-specific errors based on server response
        const message = data.message || 'Registration failed'
        if (message.toLowerCase().includes('email')) {
          setErrors(prev => ({ ...prev, email: message }))
          setTouched(prev => ({ ...prev, email: true }))
        } else if (message.toLowerCase().includes('username')) {
          setErrors(prev => ({ ...prev, username: message }))
          setTouched(prev => ({ ...prev, username: true }))
        } else {
          toast.error(message)
        }
        return
      }

      setUserEmail(formData.email)
      setRegistrationSuccess(true)
      toast.success('Registration successful!')

    } catch (err) {
      toast.error(err.message || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (registrationSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
          <CardHeader className="space-y-4 pb-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-100 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-800">
              Registration Successful!
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-center">
              <div className="flex justify-center mb-2">
                <Mail className="w-6 h-6 text-sky-600" />
              </div>
              <p className="text-sm text-sky-800">
                We've sent a verification email to <span className="font-semibold">{userEmail}</span>. 
                Please check your inbox and verify your email to activate your account.
              </p>
            </div>
            
            <Button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
              size="lg"
            >
              Continue to Login
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Didn't receive the email? Check your spam folder.
            </p>
          </CardFooter>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[500px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
        <CardHeader className="space-y-2 pb-4 sm:pb-6">
          <CardTitle className="text-3xl text-center font-bold text-slate-800">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-slate-600">
            Join Advanced Sketch and start collaborating
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-800">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="johndoe"
                className={`h-11 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50 ${
                  touched.username && errors.username ? 'border-red-500' : ''
                }`}
                required
              />
              {touched.username && errors.username && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="john@example.com"
                className={`h-11 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50 ${
                  touched.email && errors.email ? 'border-red-500' : ''
                }`}
                required
              />
              {touched.email && errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={`h-11 pr-10 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50 ${
                    touched.password && errors.password ? 'border-red-500' : ''
                  }`}
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
              
              {/* Password validation hint */}
              {touched.password && errors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
              {formData.password && !errors.password && isPasswordValid && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Password meets requirements (6+ characters)
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={`h-11 pr-10 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50 ${
                    touched.confirmPassword && errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Passwords match
                </p>
              )}
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
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-6 border-t border-slate-200">
          <p className="text-sm text-center text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}

export default Signup
