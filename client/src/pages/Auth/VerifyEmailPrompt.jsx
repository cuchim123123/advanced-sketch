import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { authAPI } from '../../services/api.service';

export default function VerifyEmailPrompt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email not found. Please try logging in again.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await authAPI.resendVerificationEmail(email);
      setMessage(response.message || 'Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Mail className="w-12 h-12 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">
            Verify Your Email
          </h1>

          {/* Description */}
          <p className="text-center text-slate-600 mb-6">
            We sent a verification link to <span className="font-semibold text-slate-800">{email}</span>. 
            Please check your inbox and click the link to verify your account.
          </p>

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Check your spam/junk folder</li>
              <li>Make sure the email address is correct</li>
              <li>Click the button below to resend</li>
            </ul>
          </div>

          {/* Resend Button */}
          <button
            onClick={handleResendEmail}
            disabled={loading || !email}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl mb-4"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </div>
            ) : (
              'Resend Verification Email'
            )}
          </button>

          {/* Back to Login */}
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 py-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          After verifying your email, you'll be able to log in to your account.
        </p>
      </div>
    </div>
  );
}
