import React, { useState, useEffect } from 'react';
import { Dices, Grid, Trophy, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabase';
import Plinko from './components/Plinko';
import Mines from './components/Mines';
import SportsBetting from './components/SportsBetting';
import Auth from './components/Auth';

type GameType = 'plinko' | 'mines' | 'sports';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<GameType>('plinko');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Verification Banner */}
      {!session.user.email_confirmed_at && (
        <div className="bg-yellow-500/10 border-b border-yellow-500 p-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="w-5 h-5" />
                <p>Please verify your email address to ensure account security.</p>
              </div>
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: session.user.email
                  });
                  if (!error) {
                    alert('Verification email sent!');
                  }
                }}
                className="bg-yellow-500 text-gray-900 px-4 py-1 rounded-md text-sm font-medium hover:bg-yellow-400"
              >
                Resend Verification
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveGame('plinko')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                activeGame === 'plinko'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Dices className="w-5 h-5" />
              Plinko
            </button>
            <button
              onClick={() => setActiveGame('mines')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                activeGame === 'mines'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Grid className="w-5 h-5" />
              Mines
            </button>
            <button
              onClick={() => setActiveGame('sports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                activeGame === 'sports'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Trophy className="w-5 h-5" />
              Sports
            </button>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="text-gray-300 hover:text-white"
          >
            Sign Out
          </button>
        </div>

        {activeGame === 'plinko' && <Plinko />}
        {activeGame === 'mines' && <Mines />}
        {activeGame === 'sports' && <SportsBetting />}
      </div>
    </div>
  );
}

export default App;