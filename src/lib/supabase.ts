import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});

// Authentication functions
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Balance management functions
export async function getBalance() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data?.balance || 0;
}

export async function updateBalance(amount: number, gameType: string, details: any = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert transaction
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount,
      game_type: gameType,
      details
    });

  if (transactionError) throw transactionError;

  // Get updated balance
  const { data, error } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data?.balance || 0;
}

// Sports betting functions
export async function fetchLiveMatches() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .rpc('fetch_live_matches');

  if (error) throw error;
  return data || [];
}

export async function placeSportsBet({
  matchId,
  betAmount,
  odds,
  prediction,
  teamA,
  teamB,
  sportType,
  betType,
  points
}: {
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

  // Insert bet
  const { error: betError } = await supabase
    .from('sports_bets')
    .insert({
      user_id: user.id,
      match_id: matchId,
      bet_amount: betAmount,
      odds,
      prediction,
      team_a: teamA,
      team_b: teamB,
      sport_type: sportType,
      bet_type: betType,
      points
    });

  if (betError) throw betError;
}