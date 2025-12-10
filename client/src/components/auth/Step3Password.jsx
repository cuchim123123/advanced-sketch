import React, { useState, useEffect } from 'react'
import { Check, X, Eye, EyeOff } from 'lucide-react'

export const Step3Password = ({ 
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onValidationChange
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  // Calculate password strength
  const calculateStrength = (pwd) => {
    if (!pwd) return { strength: 0, checks: {} }
    
    const checks = {
      length: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd)
    }
    
    const passed = Object.values(checks).filter(Boolean).length
    const strength = (passed / 4) * 100
    
    return { strength, checks }
  }

  const passwordStrength = calculateStrength(password)
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword
  const isPasswordValid = passwordStrength.strength >= 75

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange(isPasswordValid, doPasswordsMatch)
  }, [password, confirmPassword, isPasswordValid, doPasswordsMatch, onValidationChange])

  const getStrengthColor = () => {
    if (passwordStrength.strength < 50) return 'text-red-300'
    if (passwordStrength.strength < 75) return 'text-orange-300'
    if (passwordStrength.strength < 100) return 'text-yellow-300'
    return 'text-green-300'
  }

  const getStrengthLabel = () => {
    if (passwordStrength.strength < 50) return 'Weak password'
    if (passwordStrength.strength < 75) return 'Fair password'
    if (passwordStrength.strength < 100) return 'Good password'
    return 'Strong password'
  }

  const getBarColor = (index) => {
    if (index >= passwordStrength.strength / 25) return 'bg-gray-600'
    if (passwordStrength.strength < 50) return 'bg-red-500'
    if (passwordStrength.strength < 75) return 'bg-orange-500'
    if (passwordStrength.strength < 100) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-4">
      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)] block">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            className={`w-full h-11 pr-10 px-4 rounded-lg transition-all bg-white/10 border text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2 ${
              passwordTouched
                ? isPasswordValid
                  ? 'border-green-400 focus:ring-green-400'
                  : 'border-red-400 focus:ring-red-400'
                : 'border-white/20 focus:ring-white/50'
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Password Strength Meter */}
        {password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${getBarColor(i)}`}
                />
              ))}
            </div>
            <p className={`text-xs font-semibold ${getStrengthColor()}`}>
              {getStrengthLabel()}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-300' : 'text-white/40'}`}>
                {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                6+ characters
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-300' : 'text-white/40'}`}>
                {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Uppercase letter
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-300' : 'text-white/40'}`}>
                {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Lowercase letter
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-300' : 'text-white/40'}`}>
                {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                Number
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)] block">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            className={`w-full h-11 pr-10 px-4 rounded-lg transition-all bg-white/10 border text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2 ${
              confirmTouched
                ? doPasswordsMatch
                  ? 'border-green-400 focus:ring-green-400'
                  : 'border-red-400 focus:ring-red-400'
                : 'border-white/20 focus:ring-white/50'
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {confirmTouched && confirmPassword && (
          doPasswordsMatch ? (
            <p className="text-xs text-green-300 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Passwords match
            </p>
          ) : (
            <p className="text-xs text-red-300 flex items-center gap-1">
              <X className="w-3 h-3" />
              Passwords do not match
            </p>
          )
        )}
      </div>
    </div>
  )
}

export default Step3Password
