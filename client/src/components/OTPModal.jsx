import { useState, useCallback } from 'react'
import { useToast } from './Toast'

export default function OTPVerificationModal({ isOpen, email, purpose = 'email_verification', onVerified, onClose }) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('send') // send or verify
  const [expiresAt, setExpiresAt] = useState(null)
  const toast = useToast()

  const handleSendOTP = useCallback(async () => {
    if (!email) {
      toast.error('Email is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('OTP sent to your email')
        setStage('verify')
        setExpiresAt(new Date(data.expiresAt))
      } else {
        toast.error(data.message || 'Failed to send OTP')
      }
    } catch (error) {
      toast.error('Network error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [email, purpose, toast])

  const handleVerifyOTP = useCallback(async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp, purpose })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Email verified successfully!')
        onVerified?.(email)
        onClose?.()
      } else {
        toast.error(data.message || 'Invalid OTP')
      }
    } catch (error) {
      toast.error('Network error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [email, otp, purpose, toast, onVerified, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-8 animate-scale-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Email Verification</h2>
          <p className="text-gray-500 mt-2">{email}</p>
        </div>

        {stage === 'send' ? (
          <div className="space-y-4">
            <p className="text-gray-600 text-center">
              We'll send a verification code to your email address.
            </p>
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 py-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-center text-sm">
              Enter the 6-digit code we sent to your email
            </p>

            {/* OTP Input */}
            <input
              type="text"
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-4xl font-bold tracking-widest border-2 border-indigo-300 rounded-lg py-4 focus:border-indigo-600 outline-none transition"
            />

            {expiresAt && (
              <p className="text-sm text-gray-500 text-center">
                Expires at {expiresAt.toLocaleTimeString()}
              </p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              onClick={() => {
                setOtp('')
                setStage('send')
              }}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
            >
              Resend Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
