import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { SignupStepIndicator } from './SignupStepIndicator'
import { Step1BasicInfo } from './Step1BasicInfo'
import { Step2ContactInfo } from './Step2ContactInfo'
import { Step3Password } from './Step3Password'

export const SignupForm = ({ 
  formData, 
  validationErrors, 
  touchedFields,
  passwordStrength,
  loading,
  checkingAvailability,
  onInputChange, 
  onBlur, 
  onSubmit 
}) => {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3))
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SignupStepIndicator currentStep={currentStep} />

      {currentStep === 1 && (
        <Step1BasicInfo
          formData={formData}
          validationErrors={validationErrors}
          touchedFields={touchedFields}
          checkingAvailability={checkingAvailability}
          onInputChange={onInputChange}
          onBlur={onBlur}
          onNext={handleNextStep}
        />
      )}

      {currentStep === 2 && (
        <Step2ContactInfo
          formData={formData}
          validationErrors={validationErrors}
          touchedFields={touchedFields}
          checkingAvailability={checkingAvailability}
          onInputChange={onInputChange}
          onBlur={onBlur}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 3 && (
        <Step3Password
          formData={formData}
          validationErrors={validationErrors}
          touchedFields={touchedFields}
          passwordStrength={passwordStrength}
          loading={loading}
          onInputChange={onInputChange}
          onBlur={onBlur}
          onSubmit={handleSubmit}
          onBack={handlePrevStep}
        />
      )}

      {currentStep === 1 && (
        <p className="text-sm text-center text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-sky-600 hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </form>
  )
}

export default SignupForm
