import React from 'react'
import { Check, X, ArrowLeft, Lock, Loader2 } from 'lucide-react'

export const Step3Password = ({ 
  formData, 
  validationErrors, 
  touchedFields,
  passwordStrength,
  loading,
  onInputChange, 
  onBlur, 
  onSubmit,
  onBack 
}) => {
  const canSubmit = formData.password && 
    formData.confirmPassword &&
    !validationErrors.password &&
    !validationErrors.confirmPassword &&
    formData.password === formData.confirmPassword

  return (
    <div className="space-y-5">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-sky-100 rounded-full">
          <Lock className="w-10 h-10 text-sky-600" />
        </div>
      </div>

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Secure Your Account</h3>
        <p className="text-sm text-slate-500 mt-1">Create a strong password</p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={onInputChange}
          onBlur={onBlur}
          className={`w-full px-4 py-3 border rounded-lg transition bg-white text-slate-800 placeholder-slate-400 focus:ring-2 outline-none ${
            touchedFields.password && validationErrors.password
              ? 'border-red-400 focus:ring-red-400/20'
              : 'border-slate-200 focus:ring-sky-400/20 focus:border-sky-400'
          }`}
          required
        />
        
        {/* Password Strength Meter */}
        {formData.password && passwordStrength && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < passwordStrength.passed
                      ? passwordStrength.strength < 50
                        ? 'bg-red-500'
                        : passwordStrength.strength < 100
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-semibold ${
              passwordStrength.strength < 50 ? 'text-red-500' :
              passwordStrength.strength < 100 ? 'text-orange-500' :
              'text-green-500'
            }`}>
              {passwordStrength.strength < 50 ? 'Weak password' :
               passwordStrength.strength < 100 ? 'Medium password' :
               'Strong password'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                6+ characters
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Uppercase letter
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Lowercase letter
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-slate-400'}`}>
                {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Number
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={onInputChange}
          onBlur={onBlur}
          className={`w-full px-4 py-3 border rounded-lg transition bg-white text-slate-800 placeholder-slate-400 focus:ring-2 outline-none ${
            touchedFields.confirmPassword && validationErrors.confirmPassword
              ? 'border-red-400 focus:ring-red-400/20'
              : 'border-slate-200 focus:ring-sky-400/20 focus:border-sky-400'
          }`}
          required
        />
        {touchedFields.confirmPassword && formData.confirmPassword && (
          <p className={`text-xs flex items-center gap-1 ${
            formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'
          }`}>
            {formData.password === formData.confirmPassword ? (
              <><Check className="w-3 h-3" /> Passwords match</>
            ) : (
              <><X className="w-3 h-3" /> Passwords do not match</>
            )}
          </p>
        )}
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
          type="submit"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>

      <p className="text-xs text-center text-slate-500">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}

export default Step3Password
