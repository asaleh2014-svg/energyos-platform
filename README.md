# EnergyOS — Energy Portfolio Intelligence Platform

Multi-tenant SaaS platform for energy portfolio management, targeting UAE (DEWA/FEWA/SEWA/ADC) with international compatibility (NL, UK, SA, Global).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Backend | Express.js + TypeScript |
| Database | Supabase (PostgreSQL + RLS + TimescaleDB) |
| Auth | Supabase Auth (JWT + OAuth) |
| AI | Pluggable: Claude / Gemini / GPT-4o |
| Payments | Stripe |
| Deploy | Vercel (frontend) + Railway/Render (backend) |

## Project Structure

```
energyos/
├── frontend/          # React SaaS app
│   └── src/
│       ├── components/   # Layout, dashboard, charts
│       ├── pages/        # All 10 views
│       ├── lib/          # Store, API client, mock data
│       └── types/        # TypeScript types + market configs
├── backend/           # Express.js AI proxy + API
│   └── src/
│       └── routes/   # /ai/chat, /ai/summary, /connections, /sites, /invoices
└── supabase/
    └── schema.sql    # Full DB schema with RLS
```

## Quick Start

### 1. Clone & install
```bash
git clone <repo>
cd energyos
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment
```bash
# Frontend
cp frontend/.env.example frontend/.env
# Fill in your Supabase URL and anon key

# Backend
cp backend/.env.example backend/.env
# Fill in your Supabase service key and AI API keys
```

### 3. Set up Supabase
1. Create project at https://supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Enable TimescaleDB extension (optional, for scale)
4. Copy your project URL and keys to `.env`

### 4. Run locally
```bash
# From root (runs both frontend + backend)
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Deployment

### Frontend → Vercel
```bash
cd frontend
vercel deploy
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel dashboard
```

### Backend → Railway / Render
```bash
# Push to GitHub, connect Railway to repo
# Set all environment variables from .env.example
# Start command: npm run start --workspace=backend
```

## Markets Supported

| Market | Currency | Tariff Authority | Meter Format |
|--------|----------|-----------------|--------------|
| 🇦🇪 UAE | AED | DEWA / FEWA / SEWA / ADC | DEWA Reference |
| 🇳🇱 Netherlands | EUR | Enexis / Liander / Stedin | 18-digit EAN |
| 🇬🇧 United Kingdom | GBP | Ofgem / National Grid | MPAN 21-digit |
| 🇸🇦 Saudi Arabia | SAR | SEC | SEC Account |
| 🌐 International | USD | Custom | Custom |

## AI Providers

Configure in Settings → API Keys. The platform routes requests server-side — keys are never exposed to the browser.

| Provider | Model | Best for |
|----------|-------|---------|
| Claude (Anthropic) | claude-sonnet-4-20250514 | Recommended default |
| Gemini (Google) | gemini-1.5-pro | Alternative |
| GPT-4o (OpenAI) | gpt-4o | Alternative |

## Subscription Plans (AED)

- **Starter** — AED 299/mo · 5 connections · 1 seat
- **Professional** — AED 899/mo · 25 connections · 5 seats · AI auditor
- **Enterprise** — Custom · Unlimited · White-label · SLA
