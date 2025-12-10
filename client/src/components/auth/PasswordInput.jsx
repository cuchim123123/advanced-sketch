import React, { useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'

export const PasswordInput = ({ 
  id, 
  name, 
  label, 
  value, 
  onChange, 
  onBlur, 
  error, 
  touched,
  placeholder = "••••••••"
}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)] block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full h-11 pr-10 px-4 rounded-lg transition-all bg-white/10 border text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none focus:ring-2 ${
            touched
              ? error
                ? 'border-red-400 focus:ring-red-400'
                : 'border-green-400 focus:ring-green-400'
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
    </div>
  )
}

export default PasswordInput
