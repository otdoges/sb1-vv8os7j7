import { useState } from 'react';
import { supabase, signInWithPassword } from '../lib/supabase';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [verificationSent, setVerificationSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setVerificationSent(false);

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (signUpError) {
      if (signUpError.message === 'User already registered') {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(signUpError.message);
      }
    } else {
      setVerificationSent(true);
      setMessage('Please check your email for the verification link.');
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    try {
      await signInWithPassword(email, password);
    } catch (error: any) {
      if (error.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.');
      } else if (error.message === 'Email not confirmed') {
        setError('Please verify your email address before signing in.');
        setVerificationSent(true);
      } else {
        setError(error.message);
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage('Verification email has been resent. Please check your inbox.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    });
    
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Password reset instructions have been sent to your email.');
    }
    
    setLoading(false);
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    setError(null);
    setMessage(null);
    setVerificationSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Gambling Simulator
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {mode === 'signin' && 'Sign in to your account'}
            {mode === 'signup' && 'Create a new account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="appearance-none rounded-t-md relative block w-full px-3 py-2 pl-10 border border-gray-700 placeholder-gray-500 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-gray-700"
                  placeholder="Email address"
                />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-b-md relative block w-full px-3 py-2 pl-10 border border-gray-700 placeholder-gray-500 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-gray-700"
                    placeholder="Password"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {mode === 'signin' && (
              <>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                    loading
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <>
                {verificationSent ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500 text-blue-500 p-4 rounded">
                      <h3 className="font-semibold mb-2">Verify Your Email</h3>
                      <p className="text-sm mb-4">
                        We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                      </p>
                      <button
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {loading ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleSignUp}
                      disabled={loading}
                      className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                        loading
                          ? 'bg-green-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                      }`}
                    >
                      {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Already have an account? Sign in
                    </button>
                  </>
                )}
              </>
            )}

            {mode === 'forgot' && (
              <>
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                    loading
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {loading ? 'Sending reset link...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}