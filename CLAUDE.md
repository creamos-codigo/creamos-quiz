# Creamos Games

A multi-game hub for Creamos AI Friday team sessions, hosted at `quiz.creamos.com`. Currently contains two real-time multiplayer games behind a single password gate.

## Live URL
https://quiz.creamos.com (will become `games.creamos.com` later)
Login password: `Creamos.123456`

## Tech Stack
- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- Supabase Realtime Broadcast — ephemeral WebSocket pub/sub only, no DB schema, no stored data
- fal.ai (FLUX.1 schnell) — image generation for Prompt Battle
- Vercel — hosting, auto-deploys on push to `main`
- Cloudflare — DNS

## Workflow Constraint — IMPORTANT
**Local dev (`npm run dev`) is unreliable on the user's machine.** All testing happens by deploying to Vercel and testing the live URL. Each test cycle is ~2 minutes (push → Vercel build → reload).

Optimise for fewer, more complete pushes. When in doubt, ship a self-contained batch with all related files, environment variables, and instructions in one go rather than incrementally.

## Repo Structure
```
app/
  page.tsx                  Login gate, view router (hub | quiz | prompt-battle)
  layout.tsx                Poppins font, global layout, favicon
  globals.css               Tailwind v4 theme, brand colours
  favicon.ico
  api/
    generate/route.ts       fal.ai proxy for Prompt Battle image generation
components/
  GameHub.tsx               Chapter selection screen
  GameBoard.tsx             Quiz game (Chapter 1) — lobby, questions, leaderboard, music
  PromptBattle.tsx          Prompt Battle (Chapter 2) — lobby, brief, writing, generating, voting, reveal, finished
data/
  questions.ts              Quiz trivia questions
  briefs.ts                 Prompt Battle creative briefs
lib/
  supabase.ts               Supabase client
public/
  images/                   Creamos logo and assets
  music/funky-guitar.mp3    Background music (used in both games)
```

## Brand Constants — Use Exactly These
- Background: `#333333` (Creamos Black)
- Primary CTA / yellow: `#fdb648`
- Blue: `#4d5dfb`
- Red/Pink: `#fc2560`
- Green: `#25e4a2`
- Font: Poppins (Google Fonts, set in `layout.tsx`)
- Quiz answer slots are colour-coded A=Blue B=Red C=Yellow D=Green
- Prompt Battle uses green (`#25e4a2`) as its primary CTA colour to differentiate from Quiz

## Conventions
- **British English** throughout user-facing copy: "colour", "organisation", "favourite", "recognise"
- All game state lives in component state — no localStorage, no DB
- Cross-client coordination via Supabase broadcast events only
- Quiz channel: `creamos-quiz-room`. Prompt Battle channel: `creamos-prompt-battle-room`
- Player presence: each client announces itself with `player_joined` / `pb_player_joined` and re-announces when others join
- Each game has a "Back to Lobby" button (broadcasts reset to all players) and "Back to Games" button (local-only, returns to hub)
- "Back to Games" only renders on join screen, lobby, and finished screen — never mid-game

## Game Flows

### Quiz (Chapter 1)
Login → enter name → lobby → 2+ players → Start → 15s per question → reveal → next → finish. 10 questions per game.

### Prompt Battle (Chapter 2)
Login → enter name → lobby → 2+ players → Start → for each of 5 rounds: brief reveal (3s) → write prompt (30s) → generate image via fal.ai → vote (15s) → reveal (6s) → final leaderboard.

The fal.ai call happens client-side via the `/api/generate` route. The route prepends a style suffix to push outputs toward illustrated / graphic-design aesthetics (away from photorealistic defaults).

## Environment Variables
Stored in `.env.local` (local) and Vercel dashboard (Production, Preview, Development — tick all three).
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FAL_KEY` — fal.ai API key, server-side only

When adding env vars in Vercel, **redeploy** afterwards or they won't apply to existing deployments.

## Deployment
```bash
git add .
git commit -m "..."
git push origin main
```
Vercel deploys automatically on push to `main`. Build takes ~1.5 minutes.

## Cost Notes
- fal.ai FLUX schnell: ~$0.003 per image. A full Prompt Battle game = 5 rounds × N players images = ~$0.015–0.03 per game.
- Supabase: free tier covers all current usage.

## Things Not To Break
- The login gate is intentionally simple (single shared password, in-component state). Don't add auth complexity unless explicitly asked.
- Brand colours and Poppins font are non-negotiable.
- Both games must work with 2+ players minimum.
- Don't commit `.env.local`. It's in `.gitignore`.
