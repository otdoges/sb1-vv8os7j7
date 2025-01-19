import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sportsApiKey = import.meta.env.VITE_SPORTS_API_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
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

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
}

export async function createTransaction(
  amount: number,
  gameType: 'plinko' | 'mines' | 'sports',
  details: object = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount,
      game_type: gameType,
      details
    });

  if (error) throw error;
}

export async function fetchLiveMatches() {
  const response = await fetch(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${sportsApiKey}&regions=us&markets=h2h`);
  const data = await response.json();
  
  return data.map((match: any) => ({
    id: match.id,
    teamA: match.home_team,
    teamB: match.away_team,
    odds: {
      teamA: match.bookmakers[0]?.markets[0]?.outcomes[0]?.price || 2.0,
      teamB: match.bookmakers[0]?.markets[0]?.outcomes[1]?.price || 2.0
    },
    sport: match.sport_key,
    time: match.commence_time
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
      sport_type: bet.sportType
    });

  if (error) throw error;

  await createTransaction(-bet.betAmount, 'sports', {
    matchId: bet.matchId,
    type: 'bet_placed'
  });
}