import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setError(error.message);
    } else {
      // Sign in immediately after sign up
      await handleSignIn();
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    });
    
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset instructions have been sent to your email.');
    }
    
    setLoading(false);
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
          <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded">
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign In
                </button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Already have an account? Sign in
                </button>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
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