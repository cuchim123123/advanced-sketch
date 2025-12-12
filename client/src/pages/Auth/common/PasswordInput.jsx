import React, { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export const PasswordInput = ({ 
  id, 
  name, 
  label, 
  value, 
  onChange, 
  onBlur, 
  placeholder = "••••••••",
  className = "",
  error,
  touched,
  required = true 
}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className='space-y-2'>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={32}
          className={`w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 outline-none transition ${
            touched && error ? 'border-red-400' : ''
          } ${className}`}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {touched && error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}

export default PasswordInput
