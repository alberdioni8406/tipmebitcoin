# TipMeBitcoin

**Production domain:** https://tipmebitcoin.cash

Non-custodial Bitcoin Cash tipping identity platform.

## Quick start

```bash
unzip tipmebitcoin.zip   # or clone the repo
cd tipmebitcoin
cp .env.example .env     # already contains SQLite + donation address
npm install
npx prisma db push       # creates ./dev.db
npm run dev
```

Open http://localhost:3000

## Project donation address

```
bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040
```

Configured in `src/config/project.ts` (single source of truth).

## What is included

- Claim flow with cryptographic ownership challenge
- Public profiles with SEND BCH / SEND CASHTOKENS + internal QR codes
- SQLite persistence via Prisma (easy local + single-instance deploy)
- Message signature verification via `bitcoinjs-message` (compatible with Electron Cash and most BCH wallets)
- Reserved handles, rate limiting, input sanitization
- Cypherpunk mobile-first UI
- About page with project donation QR
- Protocol direction page
- Manage page stub (ready for full challenge-gated updates)

## Signature verification

Uses the classic Bitcoin Signed Message format that Electron Cash, Bitcoin.com wallet and most BCH tools support.

Install dependency (already in package.json):

```bash
npm install bitcoinjs-message
```

Development bypass (never in production):

```
ALLOW_DEV_SIGNATURE_BYPASS=true
```

Then paste `DEV_BYPASS_SIGNATURE` as the signature to test the claim flow.

## Database

Default: SQLite file `dev.db`.

```bash
npx prisma db push
npx prisma studio   # optional GUI
```

To move to PostgreSQL later, change `provider` in `prisma/schema.prisma` and set a `DATABASE_URL`.

## Deploy to Vercel

1. Create a GitHub repository and push this code.
2. Import the project in Vercel.
3. Add environment variable `DATABASE_URL`  
   - For a quick start you can use a Vercel Postgres / Neon / Turso SQLite-compatible URL,  
   - or keep file-based SQLite only if you run a single persistent instance.
4. Deploy.

Note: pure file SQLite on Vercel serverless is ephemeral. For production multi-instance use a hosted Postgres or Turso/libsql.

## Architecture notes

- Hybrid: useful registry today, clean interfaces for future on-chain identity.
- Non-custodial: we never hold keys or funds.
- Verified badge = cryptographic control of the BCH address only.
- QR codes are generated client-side (no external QR service).

## License

MIT
