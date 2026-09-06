/**
 * Bitcoin Cash WalletConnect (WC2 / wc2-bch-bcr) adapter.
 *
 * Methods used:
 *   - bch_getAddresses
 *   - bch_signMessage
 *
 * Compatible wallets (when they implement the BCH WC namespace):
 *   Cashonize, Paytaca, Zapit, and others following wc2-bch-bcr.
 *
 * Requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID from https://cloud.reown.com
 *
 * Keys never leave the wallet. TipMeBitcoin only receives address + signature.
 */

"use client";

import type {
  BchSigningAdapter,
  SignMessageRequest,
  SignMessageResult,
  WalletSession,
} from "./types";

const CHAIN_ID = "bch:bitcoincash";
const REQUIRED_METHODS = [
  "bch_getAddresses",
  "bch_signMessage",
  "bch_signTransaction",
] as const;

type SignClientInstance = {
  connect: (params: {
    requiredNamespaces: Record<string, unknown>;
    optionalNamespaces?: Record<string, unknown>;
  }) => Promise<{ uri?: string; approval: () => Promise<SessionTypes> }>;
  request: (params: {
    topic: string;
    chainId: string;
    request: { method: string; params: unknown };
  }) => Promise<unknown>;
  disconnect: (params: {
    topic: string;
    reason: { code: number; message: string };
  }) => Promise<void>;
  session: { getAll: () => SessionTypes[] };
};

type SessionTypes = {
  topic: string;
  peer?: { metadata?: { name?: string } };
  namespaces?: {
    bch?: { accounts?: string[] };
  };
};

let clientPromise: Promise<SignClientInstance | null> | null = null;
let activeSession: SessionTypes | null = null;
let pairingUri: string | null = null;

function projectId(): string {
  return (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "").trim();
}

export function isWalletConnectConfigured(): boolean {
  return projectId().length > 0;
}

async function getSignClient(): Promise<SignClientInstance | null> {
  if (!isWalletConnectConfigured()) return null;
  if (typeof window === "undefined") return null;

  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { default: SignClient } = await import(
          "@walletconnect/sign-client"
        );
        const client = await SignClient.init({
          projectId: projectId(),
          metadata: {
            name: "TipMeBitcoin",
            description:
              "Non-custodial Bitcoin Cash tipping identity. Sign a message to claim your handle.",
            url:
              process.env.NEXT_PUBLIC_APP_URL ||
              "https://tipmebitcoin.vercel.app",
            icons: ["https://tipmebitcoin.vercel.app/favicon.ico"],
          },
        });
        return client as unknown as SignClientInstance;
      } catch (err) {
        console.error("[wc-bch] SignClient init failed", err);
        return null;
      }
    })();
  }
  return clientPromise;
}

function accountsFromSession(session: SessionTypes): string[] {
  const accounts = session.namespaces?.bch?.accounts || [];
  // Format: "bch:bitcoincash:q..." or similar
  return accounts
    .map((a) => {
      const parts = a.split(":");
      // bch:bitcoincash:qrest...
      if (parts.length >= 3) {
        const payload = parts.slice(2).join(":");
        if (payload.startsWith("bitcoincash:")) return payload;
        if (payload.startsWith("q") || payload.startsWith("p")) {
          return `bitcoincash:${payload}`;
        }
        return payload;
      }
      return a;
    })
    .filter(Boolean);
}

export function getPairingUri(): string | null {
  return pairingUri;
}

export const walletConnectBchAdapter: BchSigningAdapter = {
  id: "walletconnect",
  label: "Connect BCH wallet",

  isAvailable() {
    return typeof window !== "undefined" && isWalletConnectConfigured();
  },

  async connect(): Promise<WalletSession> {
    const client = await getSignClient();
    if (!client) {
      throw new Error(
        "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or use manual signing."
      );
    }

    // Reuse existing session if present
    const existing = client.session.getAll?.() || [];
    if (existing.length > 0) {
      activeSession = existing[0];
      const addrs = accountsFromSession(activeSession);
      return {
        method: "walletconnect",
        address: addrs[0] || null,
        walletName: activeSession.peer?.metadata?.name,
      };
    }

    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        bch: {
          chains: [CHAIN_ID],
          methods: [...REQUIRED_METHODS],
          events: ["addressesChanged"],
        },
      },
    });

    pairingUri = uri || null;

    const session = await approval();
    activeSession = session;
    pairingUri = null;

    const addresses = accountsFromSession(session);
    return {
      method: "walletconnect",
      address: addresses[0] || null,
      walletName: session.peer?.metadata?.name,
    };
  },

  async disconnect(): Promise<void> {
    const client = await getSignClient();
    if (client && activeSession) {
      try {
        await client.disconnect({
          topic: activeSession.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      } catch {
        /* ignore */
      }
    }
    activeSession = null;
    pairingUri = null;
  },

  async getAddresses(): Promise<string[]> {
    const client = await getSignClient();
    if (!client || !activeSession) return [];

    try {
      const result = await client.request({
        topic: activeSession.topic,
        chainId: CHAIN_ID,
        request: { method: "bch_getAddresses", params: {} },
      });
      if (Array.isArray(result)) {
        return result.map(String);
      }
    } catch {
      /* fall through to session accounts */
    }
    return accountsFromSession(activeSession);
  },

  async signMessage(req: SignMessageRequest): Promise<SignMessageResult> {
    const client = await getSignClient();
    if (!client || !activeSession) {
      throw new Error("No WalletConnect session. Connect a wallet first.");
    }

    const result = await client.request({
      topic: activeSession.topic,
      chainId: CHAIN_ID,
      request: {
        method: "bch_signMessage",
        params: {
          message: req.message,
          userPrompt:
            req.userPrompt ||
            "Sign this message to claim your TipMeBitcoin handle. No BCH will be spent.",
          ...(req.address ? { address: req.address } : {}),
        },
      },
    });

    // Wallets may return a plain string or { signature, address }
    if (typeof result === "string") {
      return { signature: result };
    }
    if (result && typeof result === "object") {
      const obj = result as Record<string, unknown>;
      const signature = String(obj.signature || obj.sig || "");
      const address = obj.address ? String(obj.address) : undefined;
      if (!signature) {
        throw new Error("Wallet returned an empty signature.");
      }
      return { signature, address };
    }
    throw new Error("Unexpected signMessage response from wallet.");
  },
};
