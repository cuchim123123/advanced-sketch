import React from 'react'
import { Check, X, Loader2, ArrowRight, ArrowLeft, Mail, Phone } from 'lucide-react'

export const Step2ContactInfo = ({ 
  formData, 
  validationErrors, 
  touchedFields,
  checkingAvailability = {},
  onInputChange, 
  onBlur, 
  onNext,
  onBack 
}) => {
  const isStepValid = formData.email && 
    !validationErrors.email &&
    !checkingAvailability.email

  return (
    <div className="space-y-5">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-sky-100 rounded-full">
          <Mail className="w-10 h-10 text-sky-600" />
        </div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Contact Information</h3>
        <p className="text-sm text-slate-500 mt-1">How can we reach you?</p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={onInputChange}
            onBlur={onBlur}
            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition bg-white text-slate-800 placeholder-slate-400 focus:ring-2 outline-none ${
              touchedFields.email
                ? validationErrors.email
                  ? 'border-red-400 focus:ring-red-400/20'
                  : checkingAvailability.email
                  ? 'border-blue-400 focus:ring-blue-400/20'
                  : 'border-green-400 focus:ring-green-400/20'
                : 'border-slate-200 focus:ring-sky-400/20 focus:border-sky-400'
            }`}
            required
          />
          {touchedFields.email && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkingAvailability.email ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              ) : validationErrors.email ? (
                <X className="w-5 h-5 text-red-500" />
              ) : formData.email ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : null}
            </div>
          )}
        </div>
        {touchedFields.email && validationErrors.email && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-4 h-4" />
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Phone (Optional) */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="0912345678"
            value={formData.phone || ''}
            onChange={onInputChange}
            onBlur={onBlur}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg transition bg-white text-slate-800 placeholder-slate-400 focus:ring-2 outline-none ${
              touchedFields.phone && validationErrors.phone
                ? 'border-red-400 focus:ring-red-400/20'
                : 'border-slate-200 focus:ring-sky-400/20 focus:border-sky-400'
            }`}
          />
        </div>
        {touchedFields.phone && validationErrors.phone && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-4 h-4" />
            {validationErrors.phone}
          </p>
        )}
        <p className="text-xs text-slate-500">
          For account recovery and notifications
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isStepValid}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default Step2ContactInfo
