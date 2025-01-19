/*
  # Initial Schema Setup for Gambling Simulator

  1. New Tables (if they don't exist)
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users id
      - `balance` (decimal) - user's current balance
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references profiles.id
      - `amount` (decimal) - transaction amount (positive for wins, negative for losses)
      - `game_type` (text) - type of game (plinko, mines, sports)
      - `created_at` (timestamp)
      - `details` (jsonb) - additional game details
    
    - `sports_bets`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references profiles.id
      - `match_id` (text) - unique identifier for the sports match
      - `bet_amount` (decimal)
      - `odds` (decimal)
      - `prediction` (text)
      - `status` (text) - pending, won, lost
      - `created_at` (timestamp)
      - `settled_at` (timestamp)
      - `team_a` (text)
      - `team_b` (text)
      - `sport_type` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    balance decimal NOT NULL DEFAULT 1000.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    amount decimal NOT NULL,
    game_type text NOT NULL,
    created_at timestamptz DEFAULT now(),
    details jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS sports_bets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    match_id text NOT NULL,
    bet_amount decimal NOT NULL,
    odds decimal NOT NULL,
    prediction text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    settled_at timestamptz,
    team_a text NOT NULL,
    team_b text NOT NULL,
    sport_type text NOT NULL
);

-- Enable RLS (safe to run multiple times)
DO $$ 
BEGIN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sports_bets ENABLE ROW LEVEL SECURITY;
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies (dropping existing ones first to avoid conflicts)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
    DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
    DROP POLICY IF EXISTS "Users can read own sports bets" ON sports_bets;
    DROP POLICY IF EXISTS "Users can create own sports bets" ON sports_bets;
END $$;

CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can read own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own sports bets"
    ON sports_bets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sports bets"
    ON sports_bets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Drop and recreate function and trigger
DROP TRIGGER IF EXISTS on_transaction_created ON transactions;
DROP FUNCTION IF EXISTS update_balance();

CREATE OR REPLACE FUNCTION update_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET balance = balance + NEW.amount,
        updated_at = now()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_transaction_created
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_balance();