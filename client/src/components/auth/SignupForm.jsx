import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthCard, AuthHeader, AuthContent, AuthFooter } from './AuthCard'
import SignupStepIndicator from './SignupStepIndicator'
import Step1BasicInfo from './Step1BasicInfo'
import Step2ContactInfo from './Step2ContactInfo'
import Step3Password from './Step3Password'
import api from '../../services/api'

const SignupForm = ({ onSignupSuccess }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Validation states
  const [validations, setValidations] = useState({
    isUsernameAvailable: null,
    isEmailAvailable: null,
    isPasswordValid: false,
    doPasswordsMatch: false
  })

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const updateValidation = (field, value) => {
    setValidations(prev => ({ ...prev, [field]: value }))
  }

  const canProceedToStep2 = formData.username.trim().length >= 3 && validations.isUsernameAvailable === true
  const canProceedToStep3 = formData.email.trim() && validations.isEmailAvailable === true
  const canSubmit = validations.isPasswordValid && validations.doPasswordsMatch

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!canSubmit) return

    setIsLoading(true)
    setError('')

    try {
      await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      })
      
      // Call success callback with email for verification notice
      onSignupSuccess(formData.email)
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Create Account'
      case 2: return 'Contact Info'
      case 3: return 'Secure Password'
      default: return 'Create Account'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Choose your unique username'
      case 2: return 'We\'ll send verification to your email'
      case 3: return 'Create a strong password'
      default: return ''
    }
  }

  return (
    <AuthCard>
      <AuthHeader 
        title={getStepTitle()}
        description={getStepDescription()}
      />
      
      <AuthContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <SignupStepIndicator currentStep={currentStep} totalSteps={3} />

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <Step1BasicInfo
              username={formData.username}
              onUsernameChange={(value) => updateFormData('username', value)}
              isUsernameAvailable={validations.isUsernameAvailable}
              setIsUsernameAvailable={(value) => updateValidation('isUsernameAvailable', value)}
            />
          )}

          {currentStep === 2 && (
            <Step2ContactInfo
              email={formData.email}
              onEmailChange={(value) => updateFormData('email', value)}
              isEmailAvailable={validations.isEmailAvailable}
              setIsEmailAvailable={(value) => updateValidation('isEmailAvailable', value)}
            />
          )}

          {currentStep === 3 && (
            <Step3Password
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              onPasswordChange={(value) => updateFormData('password', value)}
              onConfirmPasswordChange={(value) => updateFormData('confirmPassword', value)}
              onValidationChange={(isValid, doMatch) => {
                updateValidation('isPasswordValid', isValid)
                updateValidation('doPasswordsMatch', doMatch)
              }}
            />
          )}

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 h-12 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all"
              >
                Back
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedToStep2) ||
                  (currentStep === 2 && !canProceedToStep3)
                }
                className="flex-1 h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="flex-1 h-12 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-lg shadow-lg border border-white/50 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            )}
          </div>
        </form>
      </AuthContent>

      <AuthFooter>
        <p className="text-center text-white/90 [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-white font-semibold hover:underline [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]"
          >
            Sign in
          </button>
        </p>
      </AuthFooter>
    </AuthCard>
  )
}

export default SignupForm
