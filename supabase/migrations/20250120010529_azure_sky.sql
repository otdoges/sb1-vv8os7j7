/*
  # Add auth trigger for profile creation

  1. Changes
    - Add function to handle new user creation
    - Add trigger to automatically create profile for new users
  
  2. Security
    - Function runs with security definer to ensure it has proper permissions
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, balance)
  VALUES (new.id, 1000)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();