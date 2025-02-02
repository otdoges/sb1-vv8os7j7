# Gambling Simulator

A gambling simulation app built with React, TypeScript, and Supabase.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### Environment Setup

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your Supabase project credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase project anon/public key

   You can find these values in your Supabase project dashboard under Settings > API.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Security Notes

- Never commit the `.env` file to version control
- The `.env.example` file serves as a template and should not contain real credentials
- The Supabase anon key is safe to expose in client-side code as it has limited permissions
- Row Level Security (RLS) policies in Supabase protect your data even if credentials are exposed

## Database Setup

The database schema and security policies are managed through Supabase migrations. To set up your database:

1. Install Supabase CLI
2. Link your project
3. Apply migrations:
   ```bash
   supabase db push
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## TODO 
1. Make sure google adsense works
2. add more games like blackjack


## License

This project is licensed under the MIT License - see the LICENSE file for details.
