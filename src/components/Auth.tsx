import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle, CheckCircle, Chrome } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [verificationSent, setVerificationSent] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

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

    if (!acceptedPrivacy) {
      setError('You must accept the Privacy Policy to create an account');
      setLoading(false);
      return;
    }

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          accepted_privacy: new Date().toISOString()
        }
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
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.');
      } else if (signInError.message === 'Email not confirmed') {
        setError('Please verify your email address before signing in.');
        setVerificationSent(true);
      } else {
        setError(signInError.message);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
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

        {mode === 'signup' && !verificationSent && (
          <div className="mb-4 text-sm text-gray-400">
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Privacy Policy Summary</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>We collect your email for authentication and communication</li>
                <li>Game data and transactions are stored securely</li>
                <li>We use cookies for session management</li>
                <li>We never share your personal data with third parties</li>
                <li>You can request data deletion at any time</li>
              </ul>
              <a
                href="/privacy"
                target="_blank"
                className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
              >
                Read full Privacy Policy
              </a>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                I accept the Privacy Policy and understand how my data will be used
              </span>
            </label>
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <Chrome className="w-5 h-5" />
                  Sign in with Google
                </button>

                <div className="flex items-center justify-between mt-2">
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