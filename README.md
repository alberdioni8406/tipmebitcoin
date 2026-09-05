# TipMeBitcoin

Non-custodial Bitcoin Cash tipping identity platform.

**V1 production URL:** https://tipmebitcoin.vercel.app

> A future custom domain (e.g. `tipmebitcoin.cash`) can be added later by changing the `NEXT_PUBLIC_APP_URL` environment variable. V1 does **not** require or assume ownership of any `.cash` domain.

## Project donation address

```
bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040
```

Configured in `src/config/project.ts` (single source of truth).

## Architecture (V1)

| Layer | Choice |
|-------|--------|
| Hosting | Vercel (serverless) |
| App URL | `https://tipmebitcoin.vercel.app` |
| Database | Hosted **PostgreSQL** (Neon recommended) |
| Identity | Challenge + BCH message signature |
| Custody | None — we never hold keys or funds |

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://…` (Neon pooled URL) | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://tipmebitcoin.vercel.app` | Yes |

Optional:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PROJECT_DONATION_BCH_ADDRESS` | Override donation address |
| `ALLOW_DEV_SIGNATURE_BYPASS` | Local testing only — **never** in production |

See `.env.example`.

## Local development

1. Create a free Neon Postgres database: https://neon.tech
2. Copy the connection string.
3. Configure local env:

```bash
cp .env.example .env
# Edit .env:
# DATABASE_URL="postgresql://..."
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Install and push schema:

```bash
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add environment variables:
   - `DATABASE_URL` → Neon (or other hosted Postgres) connection string
   - `NEXT_PUBLIC_APP_URL` → `https://tipmebitcoin.vercel.app`
4. Deploy.
5. After first deploy, ensure tables exist:

```bash
# From your machine, with production DATABASE_URL in .env:
npx prisma db push
```

Or run `prisma db push` as a one-time step from a machine that has the production URL.

## What is included

- Claim flow with cryptographic ownership challenge
- Public profiles with SEND BCH / SEND CASHTOKENS + internal QR codes
- PostgreSQL via Prisma (serverless-compatible)
- Message signature verification via `bitcoinjs-message`
- Reserved handles, rate limiting, input sanitization
- Cypherpunk mobile-first UI
- About page with project donation QR
- Protocol direction page
- Static `/demo` profile (no database required)
- `/api/health` for connectivity checks

## Signature verification

Uses the classic Bitcoin Signed Message format that Electron Cash, Bitcoin.com wallet and most BCH tools support.

Development bypass (never in production):

```
ALLOW_DEV_SIGNATURE_BYPASS=true
```

Then paste `DEV_BYPASS_SIGNATURE` as the signature to test the claim flow locally.

## Health check

```
GET /api/health
→ { "status": "ok", "app": "tipmebitcoin", "database": "connected" }
```

## License

MIT
