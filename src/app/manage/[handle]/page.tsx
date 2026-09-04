"use client";

import { useParams } from "next/navigation";

/**
 * Profile management requires proving control of the currently verified BCH address.
 * Full challenge → update flow can be completed following the same pattern as /claim.
 */
export default function ManagePage() {
  const params = useParams();
  const handle = (params?.handle as string) || "";

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-mono font-bold mb-4">
        MANAGE @{handle.toUpperCase()}
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        To update addresses, display name or bio you must prove control of the
        currently verified BCH address by signing a fresh challenge.
      </p>
      <p className="text-xs text-[var(--text-muted)] border border-[var(--border)] p-3">
        Full management UI follows the same non-custodial challenge-response
        pattern used for claiming. Wire it using the existing verification and
        database helpers.
      </p>
    </div>
  );
}
