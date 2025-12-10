import React, { useState, useEffect } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import api from '../../services/api'

export const Step1BasicInfo = ({ 
  username,
  onUsernameChange,
  isUsernameAvailable,
  setIsUsernameAvailable
}) => {
  const [isChecking, setIsChecking] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsUsernameAvailable(null)
      setError(username && username.length < 3 ? 'Username must be at least 3 characters' : '')
      return
    }

    const timer = setTimeout(async () => {
      setIsChecking(true)
      try {
        const response = await api.get(`/auth/check-username/${username}`)
        setIsUsernameAvailable(response.data.available)
        setError(response.data.available ? '' : 'Username is already taken')
      } catch (err) {
        setIsUsernameAvailable(false)
        setError('Error checking username')
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username, setIsUsernameAvailable])

  const handleChange = (e) => {
    onUsernameChange(e.target.value)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const getInputClasses = () => {
    const base = 'w-full h-11 pr-10 px-4 rounded-lg transition-all bg-white/10 border text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2'
    
    if (!touched) {
      return `${base} border-white/20 focus:ring-white/50`
    }
    
    if (isChecking) {
      return `${base} border-blue-400 focus:ring-blue-400`
    }
    
    if (error || isUsernameAvailable === false) {
      return `${base} border-red-400 focus:ring-red-400`
    }
    
    if (isUsernameAvailable === true) {
      return `${base} border-green-400 focus:ring-green-400`
    }
    
    return `${base} border-white/20 focus:ring-white/50`
  }

  return (
    <div className="space-y-2">
      <label htmlFor="username" className="text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)] block">
        Username
      </label>
      <div className="relative">
        <input
          id="username"
          name="username"
          type="text"
          placeholder="johndoe123"
          value={username}
          onChange={handleChange}
          onBlur={handleBlur}
          className={getInputClasses()}
          required
        />
        {touched && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isChecking ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : error || isUsernameAvailable === false ? (
              <X className="w-5 h-5 text-red-500" />
            ) : isUsernameAvailable === true ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : null}
          </div>
        )}
      </div>
      {isChecking && (
        <p className="text-xs text-blue-300 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking availability...
        </p>
      )}
      {touched && error && !isChecking && (
        <p className="text-xs text-red-300 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}
      {touched && isUsernameAvailable === true && !isChecking && (
        <p className="text-xs text-green-300 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Username is available
        </p>
      )}
    </div>
  )
}

export default Step1BasicInfo
