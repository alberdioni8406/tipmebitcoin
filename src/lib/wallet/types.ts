/**
 * BCH signing adapters — non-custodial only.
 * Private keys never leave the wallet.
 */

export type SigningMethod = "walletconnect" | "manual";

export interface WalletSession {
  method: SigningMethod;
  /** Primary BCH CashAddr from the wallet (if connected). */
  address: string | null;
  /** Human-readable wallet name if known. */
  walletName?: string;
}

export interface SignMessageRequest {
  message: string;
  /** Optional address hint; wallet may still choose its own key. */
  address?: string;
  userPrompt?: string;
}

export interface SignMessageResult {
  signature: string;
  address?: string;
}

export interface BchSigningAdapter {
  id: SigningMethod;
  label: string;
  /** Whether this adapter can run in the current browser/env. */
  isAvailable(): boolean;
  connect?(): Promise<WalletSession>;
  disconnect?(): Promise<void>;
  getAddresses?(): Promise<string[]>;
  signMessage(req: SignMessageRequest): Promise<SignMessageResult>;
}
