/*
  # Add admin permissions and poker functionality

  1. New Tables
    - `admin_users` - Stores admin user emails
    - `poker_tables` - Active poker tables
    - `poker_hands` - Hand history
    - `poker_players` - Players in active games

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    email text PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

-- Insert the admin email
INSERT INTO admin_users (email)
VALUES ('dogesman098@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Create poker tables
CREATE TABLE IF NOT EXISTS poker_tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    min_buy_in decimal NOT NULL,
    max_buy_in decimal NOT NULL,
    small_blind decimal NOT NULL,
    big_blind decimal NOT NULL,
    max_players int NOT NULL DEFAULT 9,
    created_at timestamptz DEFAULT now(),
    status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS poker_players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    table_id uuid REFERENCES poker_tables(id) NOT NULL,
    stack decimal NOT NULL,
    seat_number int NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    UNIQUE (table_id, seat_number)
);

CREATE TABLE IF NOT EXISTS poker_hands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id uuid REFERENCES poker_tables(id) NOT NULL,
    pot decimal NOT NULL DEFAULT 0,
    community_cards text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'active',
    winner_id uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_hands ENABLE ROW LEVEL SECURITY;

-- Admin check function
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = user_email
    );
END;
$$;

-- Admin policies
CREATE POLICY "Allow admin read access"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        is_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
        OR auth.uid() = id
    );

CREATE POLICY "Allow admin update access"
    ON profiles FOR UPDATE
    TO authenticated
    USING (is_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Poker table policies
CREATE POLICY "Anyone can view poker tables"
    ON poker_tables FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage poker tables"
    ON poker_tables FOR ALL
    TO authenticated
    USING (is_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Poker player policies
CREATE POLICY "Players can view active games"
    ON poker_players FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Players can join games"
    ON poker_players FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Hand history policies
CREATE POLICY "Players can view completed hands"
    ON poker_hands FOR SELECT
    TO authenticated
    USING (status = 'completed');

-- Function to join poker table
CREATE OR REPLACE FUNCTION join_poker_table(
    p_table_id uuid,
    p_buy_in decimal,
    p_seat_number int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_table record;
    v_player_id uuid;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;
    
    -- Get table info
    SELECT * INTO v_table
    FROM poker_tables
    WHERE id = p_table_id;
    
    -- Validate buy-in amount
    IF p_buy_in < v_table.min_buy_in OR p_buy_in > v_table.max_buy_in THEN
        RAISE EXCEPTION 'Invalid buy-in amount';
    END IF;
    
    -- Check if seat is available
    IF EXISTS (
        SELECT 1 FROM poker_players
        WHERE table_id = p_table_id
        AND seat_number = p_seat_number
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Seat is taken';
    END IF;
    
    -- Insert player
    INSERT INTO poker_players (user_id, table_id, stack, seat_number)
    VALUES (v_user_id, p_table_id, p_buy_in, p_seat_number)
    RETURNING id INTO v_player_id;
    
    -- Deduct buy-in from balance
    INSERT INTO transactions (user_id, amount, game_type, details)
    VALUES (v_user_id, -p_buy_in, 'poker', jsonb_build_object(
        'action', 'buy_in',
        'table_id', p_table_id,
        'amount', p_buy_in
    ));
    
    RETURN v_player_id;
END;
$$;