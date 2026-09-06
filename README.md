# TipMeBitcoin

**Non-custodial Bitcoin Cash tipping identity.**

Claim a short handle → prove control of your BCH address with a signed message → receive tips as BCH or CashTokens. No email. No password. No custody. Private keys never leave the wallet.

**Live:** [https://tipmebitcoin.vercel.app](https://tipmebitcoin.vercel.app)

---

## What it does

| Feature | Detail |
|--------|--------|
| **Handle identity** | `@yourname` public profile with tip addresses |
| **Cryptographic claim** | Challenge–response BCH message signature |
| **WalletConnect** | Cashonize, Paytaca, Zapit and other BCH WC wallets |
| **Manual signing** | Electron Cash / desktop “Sign Message” fallback |
| **CashTokens** | Token-aware addresses (`z…` / `r…`) auto-derived from BCH CashAddr |
| **QR codes** | Built-in QR for BCH and CashToken tips |
| **Non-custodial** | We never hold keys, seeds, or funds |

---

## Project donation address

```
bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040
```

Single source of truth: `src/config/project.ts`.

---

## Architecture (V1)

| Layer | Choice |
|-------|--------|
| Hosting | Vercel (serverless) |
| App URL (current) | `https://tipmebitcoin.vercel.app` |
| Database | Hosted PostgreSQL ([Neon](https://neon.tech) recommended) |
| Identity | Challenge + BCH message signature (`bitcoinjs-message`) |
| Token addresses | CashTokens CHIP type bits (`q`→`z`, `p`→`r`) |
| Custody | **None** |

---

## Environment variables

Set in **Vercel → Project → Settings → Environment Variables** (and in local `.env`):

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://…` (Neon **pooled** URL) | **Yes** |
| `NEXT_PUBLIC_APP_URL` | `https://tipmebitcoin.vercel.app` | **Yes** |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown / WalletConnect Cloud project ID | **Yes** (for Connect wallet) |

Optional:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PROJECT_DONATION_BCH_ADDRESS` | Override donation address |
| `ALLOW_DEV_SIGNATURE_BYPASS` | Local testing only — **never** in production |

See `.env.example`.

---

## Local development

```bash
cp .env.example .env
# Set DATABASE_URL, NEXT_PUBLIC_APP_URL=http://localhost:3000
# Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID if testing Connect

npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy (Vercel)

1. Push this repo to GitHub and import in Vercel.
2. Set env vars (see table above). Use Node **24.x**.
3. Deploy.
4. Ensure Neon tables exist (`npx prisma db push` against production `DATABASE_URL` if needed).

---

## Custom domain (when you have one)

Example target: `https://tipmebitcoin.cash`

You do **not** need code changes for basic routing. Do this:

### 1. Vercel

1. Project → **Settings → Domains** → add `tipmebitcoin.cash` (and `www` if wanted).
2. Follow DNS instructions (usually A/CNAME records at your registrar).
3. Wait until the domain shows **Valid**.

### 2. Environment variable (required)

Update:

```text
NEXT_PUBLIC_APP_URL=https://tipmebitcoin.cash
```

Redeploy so Open Graph URLs, profile links, and canonical metadata use the new host.

### 3. WalletConnect / Reown (required if using Connect)

In [Reown Cloud](https://cloud.reown.com/) (WalletConnect):

- Add allowed domain: `tipmebitcoin.cash` (and `www` if used).
- Keep the same `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` unless you create a new project.

### 4. Optional checks

| Item | Action |
|------|--------|
| Neon | No change (DB is independent of domain) |
| Social previews | Share a profile URL; X/Facebook should show OG image |
| Old Vercel URL | Can stay as alias or redirect to the custom domain |

### 5. What **not** to hardcode

Challenge messages use the brand prefix `TIPMEBITCOIN` (not a live domain). Profile URLs and metadata come from `NEXT_PUBLIC_APP_URL` / `PROJECT.appUrl` — keep that env var correct.

---

## Testing checklist

### Availability & claim (manual)

1. Open `/claim`.
2. Enter a new handle → **Check availability** → Available.
3. **Connect BCH wallet** (Cashonize / Paytaca) **or** paste a CashAddr.
4. After WC connect, token field should show a **`z…`** (or `r…`) address, not the same `q…`.
5. Continue → challenge text must look like:

```text
TIPMEBITCOIN
ACTION: CLAIM
HANDLE: yourhandle
ADDRESS: bitcoincash:q...
TOKEN_ADDRESS: bitcoincash:z...
NONCE: ...
TIMESTAMP: ...
EXPIRATION: ...
```

6. Sign with wallet (or paste Base64 signature) → redirect to `/{handle}`.
7. Profile shows BCH + CashToken QR / copy actions.

### API smoke tests

```bash
# Health / availability (replace host)
curl -s "https://tipmebitcoin.vercel.app/api/handles?handle=somerandomhandle123"

# Should include "available": true for a free handle
```

### Regression watches

- WC users must **not** get `TOKEN_ADDRESS: NONE` or `TOKEN_ADDRESS` equal to the `q…` address.
- Manual path may omit token → `TOKEN_ADDRESS: NONE` is allowed.
- Expired challenges prompt “Generate new challenge”.
- Reserved handles are rejected.

---

## What’s included

- Claim flow with session restore (mobile app-switch friendly)
- Public profiles + SEND BCH / SEND CASHTOKENS
- Token-aware CashAddr conversion (CashTokens CHIP)
- WalletConnect BCH `signMessage` + manual Base64 fallback
- Prisma + PostgreSQL (Neon)
- Rate limiting, reserved handles, input sanitization
- Open Graph / Twitter cards + favicon
- Cypherpunk dark UI

## What’s intentionally out of V1

- Custodial balances or withdrawal
- Email / password accounts
- On-chain identity registration (future)
- Transaction-proof claims (future option)

---

## Security notes

- Never enable `ALLOW_DEV_SIGNATURE_BYPASS` in production.
- Never commit `.env` (see `.gitignore`).
- We never request seed phrases or private keys.
- Signing is **message** signing only — no BCH is spent to claim.

---

## License / spirit

Built for Bitcoin Cash users who want simple, verifiable tip links without giving up keys.

Issues and PRs welcome on this repository.
