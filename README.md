# Trading Journal

A comprehensive trading journal application built with Next.js, Supabase, and Tremor charts. Track your trades, analyze your performance, and improve your trading strategy.

## Features

- 📊 Real-time analytics and performance metrics
- 📈 Interactive charts for visualizing trading patterns
- 🔐 Secure authentication with Supabase
- 📱 Responsive design for desktop and mobile
- 📝 Detailed trade logging and management
- 📈 Strategy performance tracking

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Tremor
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel (recommended)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Setup

Make sure to set up the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Database Setup

1. Run the migrations in your Supabase database:
   - Execute `migrations.sql`
   - Execute `create_strategies.sql`
   - Execute `check_trades.sql`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
