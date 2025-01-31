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

// Rate limiting for login attempts
const LOGIN_ATTEMPTS_LIMIT = 5;
const LOGIN_TIMEOUT_MINUTES = 15;
const LOGIN_ATTEMPTS: Record<string, { count: number; timestamp: number }> = {};

// Helper function to check rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userAttempts = LOGIN_ATTEMPTS[ip];

  if (!userAttempts) {
    LOGIN_ATTEMPTS[ip] = { count: 1, timestamp: now };
    return true;
  }

  const timeDiff = (now - userAttempts.timestamp) / (1000 * 60); // Convert to minutes
  if (timeDiff > LOGIN_TIMEOUT_MINUTES) {
    LOGIN_ATTEMPTS[ip] = { count: 1, timestamp: now };
    return true;
  }

  if (userAttempts.count >= LOGIN_ATTEMPTS_LIMIT) {
    return false;
  }

  userAttempts.count += 1;
  return true;
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Failed to fetch IP');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return 'unknown';
  }
}

async function recordLoginAttempt(userId: string, ip: string, success: boolean) {
  try {
    await supabase
      .from('login_history')
      .insert({
        user_id: userId,
        ip_address: ip,
        success,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
}

async function checkSuspiciousActivity(ip: string): Promise<boolean> {
  try {
    const { data: recentFailures } = await supabase
      .from('login_history')
      .select('*')
      .eq('ip_address', ip)
      .eq('success', false)
      .gte('timestamp', new Date(Date.now() - LOGIN_TIMEOUT_MINUTES * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (recentFailures && recentFailures.length >= LOGIN_ATTEMPTS_LIMIT) {
      return true;
    }

    const { data: recentLogins } = await supabase
      .from('login_history')
      .select('user_id')
      .eq('ip_address', ip)
      .eq('success', true)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (recentLogins) {
      const uniqueUsers = new Set(recentLogins.map(login => login.user_id));
      if (uniqueUsers.size > 3) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    return false;
  }
}

export async function signInWithPassword(email: string, password: string) {
  try {
    const ip = await getClientIP();
    
    if (!checkRateLimit(ip)) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    const isSuspicious = await checkSuspiciousActivity(ip);
    if (isSuspicious) {
      throw new Error('Suspicious activity detected. Please contact support.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await recordLoginAttempt(email, ip, false);
      throw error;
    }

    await recordLoginAttempt(data.user.id, ip, true);
    return data;
  } catch (error) {
    throw error;
  }
}

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
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, balance: 1000 }])
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}

export async function fetchLiveMatches() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('fetch_live_matches');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching live matches:', error);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Validate bet amount
  if (betAmount <= 0) throw new Error('Invalid bet amount');
  if (odds <= 0) throw new Error('Invalid odds');

  // Start a transaction
  const { data: bet, error: betError } = await supabase
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
    })
    .select()
    .single();

  if (betError) throw betError;

  // Deduct the bet amount from user's balance
  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: -betAmount,
      game_type: 'sports',
      details: {
        bet_id: bet.id,
        match_id: matchId,
        odds,
        prediction
      }
    });

  if (transactionError) throw transactionError;

  return bet;
}