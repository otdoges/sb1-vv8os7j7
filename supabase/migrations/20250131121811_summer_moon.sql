/*
  # Add Login History and Sports Betting Tables

  1. New Tables
    - `login_history`
      - `id` (uuid, primary key)
      - `user_id` (text)
      - `ip_address` (text)
      - `success` (boolean)
      - `timestamp` (timestamptz)
    - `live_matches`
      - `id` (uuid, primary key)
      - `sport_type` (text)
      - `team_a` (text)
      - `team_b` (text)
      - `odds_a` (decimal)
      - `odds_b` (decimal)
      - `start_time` (timestamptz)
      - `status` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for login history and live matches
*/

-- Create login history table
CREATE TABLE IF NOT EXISTS login_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    ip_address text NOT NULL,
    success boolean NOT NULL DEFAULT false,
    timestamp timestamptz NOT NULL DEFAULT now()
);

-- Create live matches table
CREATE TABLE IF NOT EXISTS live_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_type text NOT NULL,
    team_a text NOT NULL,
    team_b text NOT NULL,
    odds_a decimal NOT NULL,
    odds_b decimal NOT NULL,
    start_time timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'upcoming',
    spread_a decimal,
    spread_b decimal,
    spread_odds_a decimal,
    spread_odds_b decimal,
    total_points decimal,
    total_over_odds decimal,
    total_under_odds decimal
);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_matches ENABLE ROW LEVEL SECURITY;

-- Login history policies
CREATE POLICY "Users can read own login history"
    ON login_history FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert login history"
    ON login_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Live matches policies
CREATE POLICY "Anyone can read live matches"
    ON live_matches FOR SELECT
    TO authenticated
    USING (true);

-- Function to fetch live matches
CREATE OR REPLACE FUNCTION fetch_live_matches()
RETURNS SETOF live_matches
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT *
    FROM live_matches
    WHERE status = 'live'
    OR (status = 'upcoming' AND start_time > now() - interval '2 hours')
    ORDER BY start_time ASC;
$$;