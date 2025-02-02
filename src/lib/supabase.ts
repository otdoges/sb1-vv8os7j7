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

// Input validation helpers
export const validateInput = {
  number: (value: any): number | null => {
    const num = Number(value);
    return !isNaN(num) ? num : null;
  },
  
  string: (value: any): string | null => {
    return typeof value === 'string' ? value.trim() : null;
  },
  
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  gameType: (value: string): boolean => {
    const validGameTypes = ['plinko', 'mines', 'sports'];
    return validGameTypes.includes(value);
  }
};

// Balance management functions with input validation
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
  // Validate inputs
  const validAmount = validateInput.number(amount);
  if (validAmount === null) {
    throw new Error('Invalid amount');
  }

  if (!validateInput.gameType(gameType)) {
    throw new Error('Invalid game type');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Sanitize details object
  const sanitizedDetails = {
    ...details,
    amount: validAmount,
    timestamp: new Date().toISOString()
  };

  // Insert transaction with sanitized data
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: validAmount,
      game_type: gameType,
      details: sanitizedDetails
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

// Sports betting functions with input validation
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
  // Validate all inputs
  if (!validateInput.string(matchId)) {
    throw new Error('Invalid match ID');
  }

  const validBetAmount = validateInput.number(betAmount);
  if (validBetAmount === null || validBetAmount <= 0) {
    throw new Error('Invalid bet amount');
  }

  const validOdds = validateInput.number(odds);
  if (validOdds === null || validOdds <= 0) {
    throw new Error('Invalid odds');
  }

  if (!validateInput.string(prediction)) {
    throw new Error('Invalid prediction');
  }

  if (!validateInput.string(teamA) || !validateInput.string(teamB)) {
    throw new Error('Invalid team names');
  }

  if (!validateInput.string(sportType)) {
    throw new Error('Invalid sport type');
  }

  if (!validateInput.string(betType)) {
    throw new Error('Invalid bet type');
  }

  if (points !== undefined) {
    const validPoints = validateInput.number(points);
    if (validPoints === null) {
      throw new Error('Invalid points');
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert bet with validated data
  const { error: betError } = await supabase
    .from('sports_bets')
    .insert({
      user_id: user.id,
      match_id: matchId,
      bet_amount: validBetAmount,
      odds: validOdds,
      prediction,
      team_a: teamA,
      team_b: teamB,
      sport_type: sportType,
      bet_type: betType,
      points
    });

  if (betError) throw betError;
}