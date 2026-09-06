# Pass 2 — Mobile wallet connect

## New dependency

```bash
npm install @walletconnect/sign-client
```

## Environment variable (Vercel)

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-reown-cloud-project-id>
```

Get a free Project ID: https://cloud.reown.com

Also ensure:

```
NEXT_PUBLIC_APP_URL=https://tipmebitcoin.vercel.app
```

## Files to add/replace

| Path | Action |
|------|--------|
| `src/lib/wallet/types.ts` | NEW |
| `src/lib/wallet/wc-bch.ts` | NEW |
| `src/components/WalletConnectPanel.tsx` | NEW |
| `src/app/claim/page.tsx` | REPLACE |

## Protocol

- BCH WalletConnect (wc2-bch-bcr)
- Methods: `bch_getAddresses`, `bch_signMessage`, `bch_signTransaction`
- Chain: `bch:bitcoincash`

## Supported wallets (when they implement BCH WC message signing)

- Cashonize (mobile / desktop / web)
- Paytaca
- Zapit
- Others following the BCH WC2 namespace

## Fallback

Manual Base64 **Sign Message** remains fully supported (Electron Cash desktop, etc.).

## Security

- No private keys / seed phrases
- Signature verified server-side against persisted challenge (incl. TOKEN_ADDRESS)
- Challenge expiry and one-time consume unchanged
