import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sportsApiKey = '0df5c46113639dc2bc5faa0502eb99da';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`
  });
  
  if (error) throw error;
}

export async function createLocalBackup() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    const { data: bets } = await supabase
      .from('sports_bets')
      .select('*')
      .eq('user_id', user.id);

    const backup = {
      timestamp: new Date().toISOString(),
      profile,
      transactions,
      bets
    };

    // Store backup in localStorage with a timestamp
    localStorage.setItem(`backup_${Date.now()}`, JSON.stringify(backup));

    // Keep only the last 5 backups
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('backup_'))
      .sort()
      .reverse();

    while (keys.length > 5) {
      localStorage.removeItem(keys.pop()!);
    }
  } catch (error) {
    console.error('Error creating local backup:', error);
  }
}

export async function fetchLiveMatches() {
  const response = await fetch(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${sportsApiKey}&regions=us&markets=h2h,spreads,totals`);
  const data = await response.json();
  
  return data.map((match: any) => ({
    id: match.id,
    teamA: match.home_team,
    teamB: match.away_team,
    sport: match.sport_key,
    time: match.commence_time,
    odds: {
      teamA: match.bookmakers[0]?.markets.find((m: any) => m.key === 'h2h')?.outcomes.find((o: any) => o.name === match.home_team)?.price || 2.0,
      teamB: match.bookmakers[0]?.markets.find((m: any) => m.key === 'h2h')?.outcomes.find((o: any) => o.name === match.away_team)?.price || 2.0
    },
    spreads: {
      teamA: {
        points: match.bookmakers[0]?.markets.find((m: any) => m.key === 'spreads')?.outcomes.find((o: any) => o.name === match.home_team)?.point || 0,
        odds: match.bookmakers[0]?.markets.find((m: any) => m.key === 'spreads')?.outcomes.find((o: any) => o.name === match.home_team)?.price || 2.0
      },
      teamB: {
        points: match.bookmakers[0]?.markets.find((m: any) => m.key === 'spreads')?.outcomes.find((o: any) => o.name === match.away_team)?.point || 0,
        odds: match.bookmakers[0]?.markets.find((m: any) => m.key === 'spreads')?.outcomes.find((o: any) => o.name === match.away_team)?.price || 2.0
      }
    },
    totals: {
      over: {
        points: match.bookmakers[0]?.markets.find((m: any) => m.key === 'totals')?.outcomes.find((o: any) => o.name === 'Over')?.point || 0,
        odds: match.bookmakers[0]?.markets.find((m: any) => m.key === 'totals')?.outcomes.find((o: any) => o.name === 'Over')?.price || 2.0
      },
      under: {
        points: match.bookmakers[0]?.markets.find((m: any) => m.key === 'totals')?.outcomes.find((o: any) => o.name === 'Under')?.point || 0,
        odds: match.bookmakers[0]?.markets.find((m: any) => m.key === 'totals')?.outcomes.find((o: any) => o.name === 'Under')?.price || 2.0
      }
    }
  }));
}

export async function placeSportsBet(bet: {
  matchId: string;
  betAmount: number;
  odds: number;
  prediction: string;
  teamA: string;
  teamB: string;
  sportType: string;
  betType: string;
  points?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('sports_bets')
    .insert({
      user_id: user.id,
      match_id: bet.matchId,
      bet_amount: bet.betAmount,
      odds: bet.odds,
      prediction: bet.prediction,
      team_a: bet.teamA,
      team_b: bet.teamB,
      sport_type: bet.sportType,
      bet_type: bet.betType,
      points: bet.points
    });

  if (error) throw error;

  await createTransaction(-bet.betAmount, 'sports', {
    matchId: bet.matchId,
    type: 'bet_placed',
    betType: bet.betType
  });
}