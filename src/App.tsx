import React, { useState, useEffect } from 'react';
import { Dices, Grid, Trophy } from 'lucide-react';
import { supabase, getProfile, createLocalBackup } from './lib/supabase';
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

    // Set up automatic backups every 2 hours
    const backupInterval = setInterval(createLocalBackup, 7200000);

    return () => {
      subscription.unsubscribe();
      clearInterval(backupInterval);
    };
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
      {/* Rest of the App component remains the same */}
    </div>
  );
}

export default App;