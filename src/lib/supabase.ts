import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return '';
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
    // Get recent failed attempts from this IP
    const { data: recentFailures } = await supabase
      .from('login_history')
      .select('*')
      .eq('ip_address', ip)
      .eq('success', false)
      .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order('timestamp', { ascending: false });

    // If there are more than 5 failed attempts in the last 15 minutes
    if (recentFailures && recentFailures.length >= 5) {
      return true;
    }

    // Check if this IP has recently logged in to different accounts
    const { data: recentLogins } = await supabase
      .from('login_history')
      .select('user_id')
      .eq('ip_address', ip)
      .eq('success', true)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: false });

    if (recentLogins) {
      const uniqueUsers = new Set(recentLogins.map(login => login.user_id));
      // If this IP has logged into more than 3 different accounts in 24 hours
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

async function signInWithPassword(email: string, password: string) {
  try {
    const ip = await getClientIP();
    
    // First check if this IP has suspicious activity
    const isSuspicious = await checkSuspiciousActivity(ip);
    if (isSuspicious) {
      throw new Error('Too many login attempts. Please try again later.');
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

async function fetchLiveMatches() {
  try {
    const { data, error } = await supabase
      .rpc('fetch_live_matches');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching live matches:', error);
    return [];
  }
}

async function placeSportsBet({
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

async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error?.code === 'PGRST116' || !data) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, balance: 1000 }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return null;
      }

      return newProfile;
    }

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

export {
  supabase,
  signInWithPassword,
  getProfile,
  fetchLiveMatches,
  placeSportsBet
}