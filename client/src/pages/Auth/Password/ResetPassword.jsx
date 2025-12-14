import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/config';
import { AuthLayout } from '../common/AuthLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2, Check, X, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/common';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('uid');
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Simple password validation - backend requires minimum 6 characters
  const isPasswordValid = newPassword.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId || !token) {
      toast.error('Reset link is invalid or has expired.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to reset password.');

      setResetSuccess(true);
      toast.success('Password reset successful!');
    } catch (err) {
      toast.error(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const invalidLink = !userId || !token;

  if (resetSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
          <CardHeader className="space-y-4 pb-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-100 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-800">
              Password Reset!
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
              size="lg"
            >
              Sign In Now
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
        <CardHeader className="space-y-4 pb-6">
          <Link 
            to="/login" 
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <div className="flex justify-center">
            <div className="p-4 bg-sky-100 rounded-full">
              {invalidLink ? (
                <Lock className="w-12 h-12 text-red-500" />
              ) : (
                <Lock className="w-12 h-12 text-sky-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold text-slate-800">
            {invalidLink ? 'Invalid Link' : 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center text-slate-600 text-base">
            {invalidLink
              ? 'This reset link is invalid or has expired.'
              : 'Enter your new password below.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invalidLink ? (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p>The password reset link you followed is missing required information or has expired. Please request a new password reset link.</p>
              </div>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                size="lg"
              >
                Request New Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-800">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-11 pr-10 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password validation hint */}
                {newPassword && !isPasswordValid && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Password must be at least 6 characters
                  </p>
                )}
                {newPassword && isPasswordValid && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Password meets requirements (6+ characters)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-800">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-11 pr-10 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg disabled:opacity-50"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" variant="button" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default ResetPassword;
