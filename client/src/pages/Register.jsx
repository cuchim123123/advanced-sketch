import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../services/api'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthCard, AuthHeader, AuthContent } from '../components/auth/AuthCard'
import { SignupForm } from '../components/auth/SignupForm'
import { VerificationNotice } from '../components/auth/VerificationNotice'

const Register = () => {
  const [loading, setLoading] = useState(false)
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [validationErrors, setValidationErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [checkingAvailability, setCheckingAvailability] = useState({})
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      navigate('/dashboard')
    }
  }, [navigate])

  const calculatePasswordStrength = (password) => {
    let strength = 0
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    }
    
    if (checks.length) strength += 25
    if (checks.uppercase) strength += 25
    if (checks.lowercase) strength += 25
    if (checks.number) strength += 25
    
    return { strength, checks }
  }

  const validateField = (name, value) => {
    const errors = {}
    
    switch(name) {
      case 'username':
        if (value.length < 3) errors.username = 'Username must be at least 3 characters'
        else if (value.length > 30) errors.username = 'Username must not exceed 30 characters'
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) errors.username = 'Username must be alphanumeric (underscores allowed)'
        break
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Please enter a valid email'
        break
      case 'password':
        if (value.length < 6) errors.password = 'Password must be at least 6 characters'
        else if (value.length > 32) errors.password = 'Password must not exceed 32 characters'
        break
      case 'confirmPassword':
        if (value !== formData.password) errors.confirmPassword = 'Passwords do not match'
        break
      default:
        break
    }
    
    return errors
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (touchedFields[name]) {
      const errors = validateField(name, value)
      setValidationErrors(prev => ({ ...prev, ...errors }))
      if (!errors[name]) {
        setValidationErrors(prev => {
          const updated = { ...prev }
          delete updated[name]
          return updated
        })
      }
    }

    // Check availability for username and email
    if ((name === 'username' || name === 'email') && value.length >= 3) {
      checkAvailability(name, value)
    }
  }

  const checkAvailability = async (field, value) => {
    // Clear any existing timeout for this field
    if (window[`${field}Timeout`]) {
      clearTimeout(window[`${field}Timeout`])
    }

    // Debounce the API call
    window[`${field}Timeout`] = setTimeout(async () => {
      setCheckingAvailability(prev => ({ ...prev, [field]: true }))

      try {
        const endpoint = field === 'username' 
          ? `/auth/check-username/${encodeURIComponent(value)}`
          : `/auth/check-email/${encodeURIComponent(value)}`
        
        const res = await api.get(endpoint)

        if (!res.data.available) {
          setValidationErrors(prev => ({
            ...prev,
            [field]: res.data.message || `This ${field} is already taken`
          }))
        } else {
          setValidationErrors(prev => {
            const updated = { ...prev }
            delete updated[field]
            return updated
          })
        }
      } catch (err) {
        console.error(`Error checking ${field}:`, err)
      } finally {
        setCheckingAvailability(prev => ({ ...prev, [field]: false }))
      }
    }, 500)
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    const errors = validateField(name, value)
    setValidationErrors(prev => ({ ...prev, ...errors }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    const allErrors = {}
    Object.keys(formData).forEach(key => {
      const errors = validateField(key, formData[key])
      Object.assign(allErrors, errors)
    })
    
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors)
      setTouchedFields({ username: true, email: true, password: true, confirmPassword: true })
      toast.error('Please fix all validation errors')
      return
    }
    
    setLoading(true)

    const { username, email, password } = formData

    try {
      const res = await api.post('/auth/register', { 
        username: username.trim(), 
        email: email.trim(), 
        password 
      })

      setUserEmail(email)
      setShowVerificationNotice(true)

      toast.success(res.data.message || "Registration successful! Please check your email.", {
        position: "top-center",
        duration: 5000,
      })

    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong", {
        position: "top-center",
      })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = calculatePasswordStrength(formData.password)

  if (showVerificationNotice) {
    return (
      <AuthLayout>
        <VerificationNotice userEmail={userEmail} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader 
          title="Create Account" 
          subtitle="Join CoPad and start sketching together"
        />
        <AuthContent>
          <SignupForm
            formData={formData}
            validationErrors={validationErrors}
            touchedFields={touchedFields}
            passwordStrength={passwordStrength}
            loading={loading}
            checkingAvailability={checkingAvailability}
            onInputChange={handleInputChange}
            onBlur={handleBlur}
            onSubmit={handleSubmit}
          />
        </AuthContent>
      </AuthCard>
    </AuthLayout>
  )
}

export default Register
