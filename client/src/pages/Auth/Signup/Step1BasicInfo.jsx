import React from 'react'
import { Check, X, Loader2, ArrowRight, User } from 'lucide-react'

export const Step1BasicInfo = ({ 
  formData, 
  validationErrors, 
  touchedFields,
  checkingAvailability = {},
  onInputChange, 
  onBlur, 
  onNext 
}) => {
  const isStepValid = formData.username && 
    !validationErrors.username &&
    !checkingAvailability.username

  return (
    <div className="space-y-5">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-sky-100 rounded-full">
          <User className="w-10 h-10 text-sky-600" />
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Create Your Account</h3>
        <p className="text-sm text-slate-500 mt-1">Choose a unique username</p>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Username
        </label>
        <div className="relative">
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={onInputChange}
            onBlur={onBlur}
            className={`w-full px-4 py-3 pr-10 border rounded-lg transition bg-white text-slate-800 placeholder-slate-400 focus:ring-2 outline-none ${
              touchedFields.username
                ? validationErrors.username
                  ? 'border-red-400 focus:ring-red-400/20'
                  : checkingAvailability.username
                  ? 'border-blue-400 focus:ring-blue-400/20'
                  : 'border-green-400 focus:ring-green-400/20'
                : 'border-slate-200 focus:ring-sky-400/20 focus:border-sky-400'
            }`}
            required
          />
          {touchedFields.username && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkingAvailability.username ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              ) : validationErrors.username ? (
                <X className="w-5 h-5 text-red-500" />
              ) : formData.username ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : null}
            </div>
          )}
        </div>
        {touchedFields.username && validationErrors.username && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-4 h-4" />
            {validationErrors.username}
          </p>
        )}
        <p className="text-xs text-slate-500">
          3-30 characters, letters, numbers and underscores only
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!isStepValid}
        className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default Step1BasicInfo
