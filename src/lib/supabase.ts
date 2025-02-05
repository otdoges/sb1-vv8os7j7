import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables with better error handling and validation
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Validate URL format
const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Create Supabase client with validation
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!validateUrl(supabaseUrl)) {
  throw new Error('Invalid SUPABASE_URL format. Please check your environment variables.');
}

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
);

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

// Balance management functions with input validation and error handling
export async function getBalance() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data?.balance || 0;
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

export async function updateBalance(amount: number, gameType: string, details: any = {}) {
  try {
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
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
}

// Sports betting functions with improved error handling
export async function fetchLiveMatches() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('fetch_live_matches');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
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
  try {
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
  } catch (error) {
    console.error('Error placing bet:', error);
    throw error;
  }
}