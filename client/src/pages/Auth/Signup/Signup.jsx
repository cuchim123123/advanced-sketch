import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { api } from '@/services'
import { AuthLayout, AuthCard, AuthHeader, AuthContent } from '../common'
import { SignupForm } from './SignupForm'
import { VerificationNotice } from './VerificationNotice'

export default function Signup() {
  const [loading, setLoading] = useState(false)
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    phone: '',
    password: '', 
    confirmPassword: '' 
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [checkingAvailability, setCheckingAvailability] = useState({})
  const navigate = useNavigate()
  const { token } = useAuthStore()

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/dashboard')
    }
  }, [token, navigate])

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
    
    const passed = Object.values(checks).filter(Boolean).length
    
    return { strength, checks, passed }
  }

  const validateField = (name, value) => {
    const errors = {}
    
    switch(name) {
      case 'username':
        if (value.length < 3) errors.username = 'Username must be at least 3 characters'
        else if (value.length > 30) errors.username = 'Username must not exceed 30 characters'
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) errors.username = 'Username must be alphanumeric (letters, numbers, underscores)'
        break
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Please enter a valid email'
        break
      case 'phone':
        if (value && !/^[\+]?[0-9]{10,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          errors.phone = 'Phone must be 10-15 digits'
        }
        break
      case 'password':
        if (value.length < 6) errors.password = 'Password must be at least 6 characters'
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
    setCheckingAvailability(prev => ({ ...prev, [field]: true }))
    try {
      const { data } = await api.get(`/auth/check-availability?${field}=${value}`)
      if (!data.available) {
        setValidationErrors(prev => ({ 
          ...prev, 
          [field]: `This ${field} is already taken` 
        }))
      }
    } catch (error) {
      // Ignore availability check errors
    } finally {
      setCheckingAvailability(prev => ({ ...prev, [field]: false }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    const errors = validateField(name, value)
    setValidationErrors(prev => ({ ...prev, ...errors }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      }
      
      if (formData.phone) {
        payload.phone = formData.phone.replace(/[\s\-\(\)]/g, '')
      }
      
      await api.post('/auth/register', payload)
      setUserEmail(formData.email)
      setShowVerificationNotice(true)
    } catch (error) {
      setValidationErrors({ 
        submit: error.response?.data?.message || 'Registration failed' 
      })
    } finally {
      setLoading(false)
    }
  }

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
          subtitle="Start collaborating on sketches"
        />

        <AuthContent>
          {validationErrors.submit && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
              {validationErrors.submit}
            </div>
          )}
          
          <SignupForm
            formData={formData}
            validationErrors={validationErrors}
            touchedFields={touchedFields}
            passwordStrength={calculatePasswordStrength(formData.password)}
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
