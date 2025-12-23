import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '@/services/config';
import { AuthLayout } from '../common/AuthLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/common';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'invalid'
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  // Separate useEffect for countdown timer to avoid multiple timers
  useEffect(() => {
    if (status !== 'success') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  useEffect(() => {
    let isMounted = true;
    
    const verifyEmail = async () => {
      const uid = searchParams.get('uid');
      const token = searchParams.get('token');

      // Check if parameters are present
      if (!uid || !token) {
        if (isMounted) {
          setStatus('invalid');
          setMessage('Invalid verification link. Please check your email and try again.');
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-email?uid=${uid}&token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();

        if (!isMounted) return;

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Your email has been successfully verified!');
        } else {
          // Special case: "Email is already verified" should be treated as success
          const isAlreadyVerified = data.message?.toLowerCase().includes('already verified');
          
          if (isAlreadyVerified) {
            setStatus('success');
            setMessage('Your email is already verified. You can sign in now!');
          } else {
            setStatus('error');
            setMessage(data.message || 'Verification failed. The link may have expired.');
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
        if (isMounted) {
          setStatus('error');
          setMessage('An error occurred during verification. Please try again later.');
        }
      }
    };

    verifyEmail();
    
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="p-6 bg-sky-100 rounded-full">
                  <LoadingSpinner size="lg" variant="default" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Verifying Your Email
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'success':
        return (
          <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Email Verified!
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-center">
                <p className="text-sm text-sky-800">
                  Redirecting to login in <span className="font-bold text-lg">{countdown}</span> seconds...
                </p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                size="lg"
              >
                <span className="flex items-center gap-2">
                  Sign In Now
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-red-100 rounded-full">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Verification Failed
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p>The verification link may have expired or already been used. Please request a new verification email.</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/register')}
                  variant="outline"
                  className="flex-1 h-11 border-slate-300 hover:bg-slate-50 text-slate-800"
                >
                  Register Again
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="flex-1 h-11 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'invalid':
        return (
          <Card className="w-full max-w-[480px] mx-auto shadow-2xl border border-slate-200 bg-white/80 backdrop-blur-xl animate-in fade-in duration-500">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-orange-100 rounded-full">
                  <AlertCircle className="w-12 h-12 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Invalid Link
              </CardTitle>
              <CardDescription className="text-slate-600 text-base">
                {message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <p>Please check your email for the correct verification link, or request a new one.</p>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-semibold shadow-lg"
                size="lg"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout>
      {renderContent()}
    </AuthLayout>
  );
};

export default VerifyEmail;
