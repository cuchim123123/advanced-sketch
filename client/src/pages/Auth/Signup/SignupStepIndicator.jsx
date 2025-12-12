import React from 'react'
import { Check } from 'lucide-react'

export const SignupStepIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Account' },
    { number: 2, label: 'Contact' },
    { number: 3, label: 'Password' }
  ]

  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                currentStep > step.number
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white'
                  : currentStep === step.number
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white ring-4 ring-sky-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > step.number ? (
                <Check className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            <span className={`text-xs mt-1 ${
              currentStep >= step.number ? 'text-slate-700 font-medium' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div 
              className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${
                currentStep > step.number ? 'bg-gradient-to-r from-sky-500 to-emerald-500' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default SignupStepIndicator
