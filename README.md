# Tailor Shop Management System

Complete management system for tailor shops — sales orders, deliveries, billing, and reports.

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM with **Turso** (libSQL)
- Recharts, Zustand, JWT auth

## Local Development

```bash
bun install
cp .env.example .env
# Edit .env with your Turso DB URL + token + JWT secret
bun run db:push        # Create/sync schema
bun run dev            # Start dev server
```

Open http://localhost:3000 and login with `admin / admin123`.

## Deploy to Vercel (Auto-Deploy from GitHub)

1. **Fork or push** this repo to your GitHub account.
2. Go to https://vercel.com/new and import the GitHub repo.
3. Vercel auto-detects Next.js — keep defaults.
4. Add the following Environment Variables in Vercel project settings:
   - `DATABASE_URL` — `libsql://...` from Turso
   - `DATABASE_AUTH_TOKEN` — Turso auth token
   - `JWT_SECRET` — any long random string
5. Click **Deploy**. Every push to `main` will trigger auto-deploy.

## Turso Database Setup

1. Create a free account at https://turso.tech
2. Create a new database (e.g. `tailor-shop`)
3. Run `turso db tokens create tailor-shop` to get an auth token
4. Get the URL via `turso db show tailor-shop --url`
5. Push schema: `DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... bun run db:push`

## Default Login
- Username: `admin`
- Password: `admin123`

(Change this in production by editing the User table after first login.)

## Features

- **Dashboard** — monthly growth chart, KPI cards, status breakdown
- **Sales Orders** — auto ID, multi-item, customer duplicate check, "in words" total
- **Delivery** — search by order ID, partial/full delivery, status tracking
- **Bill Collection** — order-wise, payment history, multiple methods
- **Setup** — UoM, Items, Tailors, Customers, Delivery Info
- **Reports** — P&L (daily/monthly/yearly), Receivable, Payable, Order report
