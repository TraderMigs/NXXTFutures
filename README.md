# NXXT Futures — Private Trading Terminal

Private signal monitoring and chart analysis platform for futures trading.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Supabase (auth, database, edge functions)
- **Data:** TwelveData API
- **AI:** Anthropic Claude (analyze-chart edge function)
- **Email:** Resend
- **Hosting:** Vercel

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Supabase setup
Run `supabase/schema.sql` in your Supabase SQL editor.

Create a storage bucket named `charts` (public).

### 4. Edge function secrets
In Supabase Dashboard → Edge Functions → Manage Secrets, add:
- `ANTHROPIC_API_KEY`
- `TWELVE_DATA_API_KEY`
- `RESEND_API_KEY`

### 5. Deploy edge functions
Deploy via Supabase CLI or GitHub Actions.

### 6. Run locally
```bash
npm run dev
```

## Features
- **Hot Picks tab:** Auto-populating futures signals with confidence scores, copy buttons, position sizing
- **Data Analysis tab:** Chart screenshot upload → SMC analysis → trade setup
- Account balance & risk % auto-calculates contracts per trade
- Single-user auth (private use only)
