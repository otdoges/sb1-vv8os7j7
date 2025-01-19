import React, { useState, useEffect } from 'react';
import { Dices, Grid, Trophy } from 'lucide-react';
import { supabase, getProfile } from './lib/supabase';
import Plinko from './components/Plinko';
import Mines from './components/Mines';
import SportsBetting from './components/SportsBetting';
import Auth from './components/Auth';

type GameType = 'plinko' | 'mines' | 'sports';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeGame, setActiveGame] = useState<GameType>('plinko');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async () => {
    const profile = await getProfile();
    setProfile(profile);
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Gambling Simulator</h1>
              <p className="text-gray-400 mt-2">For entertainment purposes only - No real money involved</p>
            </div>
            <div className="text-white text-right">
              <p className="text-sm">Balance</p>
              <p className="text-2xl font-bold">${profile?.balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveGame('plinko')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg ${
                activeGame === 'plinko'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Dices className="inline-block mr-2 h-5 w-5" />
              Plinko
            </button>
            <button
              onClick={() => setActiveGame('mines')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg ${
                activeGame === 'mines'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Grid className="inline-block mr-2 h-5 w-5" />
              Mines
            </button>
            <button
              onClick={() => setActiveGame('sports')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg ${
                activeGame === 'sports'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Trophy className="inline-block mr-2 h-5 w-5" />
              Sports
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeGame === 'plinko' ? (
          <Plinko />
        ) : activeGame === 'mines' ? (
          <Mines />
        ) : (
          <SportsBetting />
        )}
      </main>

      <footer className="bg-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-gray-400">
            This is a simulation game. No real gambling or money is involved.
            Please gamble responsibly in real-life situations.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;