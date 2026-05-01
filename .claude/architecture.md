# Architecture

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS v4
- Supabase Realtime Broadcast (ephemeral pub/sub, no DB schema needed)
- Vercel (auto-deploys on push to main)

## Key Files
- `app/page.tsx` — login gate, renders GameBoard after auth
- `app/layout.tsx` — Poppins font, global layout
- `app/globals.css` — Tailwind v4 theme, Creamos brand colors
- `components/GameBoard.tsx` — all multiplayer logic, lobby, questions, leaderboard
- `data/questions.ts` — 20 trivia questions with correctAnswerIndex
- `lib/supabase.ts` — Supabase client initialization

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
(stored in .env.local locally, and in Vercel dashboard for production)

## Real-time Flow
Supabase Realtime Broadcast on channel `creamos-quiz-room`:
- `player_joined` — adds player to lobby
- `start_game` — syncs all clients to begin
- `player_finished` — sends name + score to build leaderboard