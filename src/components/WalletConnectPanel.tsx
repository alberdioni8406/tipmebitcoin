"use client";

import { useEffect, useState } from "react";
import { QRCode } from "@/components/QRCode";
import {
  getPairingUri,
  isWalletConnectConfigured,
  walletConnectBchAdapter,
} from "@/lib/wallet/wc-bch";

interface Props {
  /** Called with CashAddr after successful connection. */
  onConnected: (address: string, walletName?: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * WalletConnect BCH pairing panel.
 * Shows a QR / URI for Cashonize, Paytaca, Zapit, etc.
 */
export function WalletConnectPanel({
  onConnected,
  onError,
  disabled,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const configured = isWalletConnectConfigured();

  useEffect(() => {
    // Poll pairing URI after connect starts (set synchronously after client.connect)
    if (!busy) return;
    const id = setInterval(() => {
      const u = getPairingUri();
      if (u) setUri(u);
    }, 200);
    return () => clearInterval(id);
  }, [busy]);

  async function connect() {
    if (!configured) {
      onError(
        "WalletConnect is not configured on this deployment. Use manual Sign Message instead."
      );
      return;
    }
    setBusy(true);
    setUri(null);
    onError("");
    try {
      const session = await walletConnectBchAdapter.connect!();
      if (session.address) {
        onConnected(session.address, session.walletName);
      } else {
        // Session ok but no address in namespace — try getAddresses
        const addrs = await walletConnectBchAdapter.getAddresses!();
        if (addrs[0]) {
          onConnected(addrs[0], session.walletName);
        } else {
          onError(
            "Wallet connected but no BCH address was returned. Try manual signing or another wallet."
          );
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Wallet connection cancelled.";
      onError(msg);
    } finally {
      setBusy(false);
      setUri(null);
    }
  }

  if (!configured) {
    return (
      <div className="card text-sm text-[var(--text-muted)] space-y-2">
        <p className="font-mono text-xs text-[var(--accent)]">
          CONNECT BCH WALLET
        </p>
        <p>
          WalletConnect is not enabled on this deployment yet. Use{" "}
          <strong>Manual message signing</strong> below (Electron Cash desktop
          Sign Message, or any wallet that supports classic BCH message
          signatures).
        </p>
        <p className="text-xs">
          Operator: set{" "}
          <code className="text-[var(--text)]">
            NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
          </code>{" "}
          in Vercel (free at cloud.reown.com), then redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-primary w-full"
        disabled={disabled || busy}
        onClick={connect}
      >
        {busy ? "Waiting for wallet…" : "CONNECT BCH WALLET"}
      </button>
      <p className="text-xs text-[var(--text-muted)] text-center">
        No BCH is spent. Your private keys never leave your wallet.
        Works with Cashonize, Paytaca, Zapit and other BCH WalletConnect wallets.
      </p>
      {uri && (
        <div className="card text-center space-y-3">
          <p className="text-xs font-mono text-[var(--text-muted)]">
            Scan with your BCH wallet
          </p>
          <div className="flex justify-center">
            <QRCode value={uri} size={200} />
          </div>
          <p className="text-xs break-all text-[var(--text-muted)] max-h-16 overflow-y-auto">
            {uri}
          </p>
        </div>
      )}
    </div>
  );
}
