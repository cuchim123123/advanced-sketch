import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/config';
import { AuthLayout } from '../common/AuthLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email.trim() }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      setEmailSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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
              Check Your Email
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              We've sent a password reset link to <span className="font-semibold">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm text-sky-800">
              <p>Didn't receive the email? Check your spam folder or try again with a different email address.</p>
            </div>
            
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full h-11 border-slate-300 hover:bg-slate-50 text-slate-800"
            >
              Try Another Email
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center pt-6 border-t border-slate-200">
            <Link 
              to="/login" 
              className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </CardFooter>
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
              <Mail className="w-12 h-12 text-sky-600" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold text-slate-800">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-center text-slate-600 text-base">
            No worries! Enter your email and we'll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-11 bg-white/80 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/50"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" variant="button" />
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default ForgotPassword;
