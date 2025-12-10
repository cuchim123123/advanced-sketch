import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthLayout, SignupForm, VerificationNotice } from '../components/auth'

export default function Register() {
  const navigate = useNavigate()
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (token) {
      navigate('/dashboard')
    }
  }, [navigate])

  const handleSignupSuccess = (email) => {
    setUserEmail(email)
    setShowVerificationNotice(true)
  }

  return (
    <AuthLayout>
      {showVerificationNotice ? (
        <VerificationNotice userEmail={userEmail} />
      ) : (
        <SignupForm onSignupSuccess={handleSignupSuccess} />
      )}
    </AuthLayout>
  )
}
