/**
 * Database layer — Prisma + PostgreSQL.
 * Requires DATABASE_URL pointing at a hosted Postgres instance.
 * Run once after provisioning: npx prisma db push
 */

import { PrismaClient } from "@prisma/client";
import type { Challenge as ChallengeType } from "./verification";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export interface HandleRecord {
  id: string;
  handle: string;
  normalizedHandle: string;
  status: "active" | "suspended";
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  bchAddress: string;
  tokenAddress: string | null;
  verified: boolean;
}

function toRecord(h: {
  id: string;
  handle: string;
  normalizedHandle: string;
  status: string;
  displayName: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
  bchAddress: string;
  tokenAddress: string | null;
  verified: boolean;
}): HandleRecord {
  return {
    id: h.id,
    handle: h.handle,
    normalizedHandle: h.normalizedHandle,
    status: h.status as "active" | "suspended",
    displayName: h.displayName,
    bio: h.bio,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
    bchAddress: h.bchAddress,
    tokenAddress: h.tokenAddress,
    verified: h.verified,
  };
}

export async function findHandleByNormalized(
  normalized: string
): Promise<HandleRecord | null> {
  try {
    const h = await prisma.handle.findUnique({
      where: { normalizedHandle: normalized },
    });
    return h ? toRecord(h) : null;
  } catch {
    return null;
  }
}

export async function isHandleAvailable(normalized: string): Promise<boolean> {
  try {
    const count = await prisma.handle.count({
      where: { normalizedHandle: normalized },
    });
    return count === 0;
  } catch {
    return false;
  }
}

export async function claimHandle(params: {
  handle: string;
  normalizedHandle: string;
  bchAddress: string;
  tokenAddress: string | null;
  verified: boolean;
}): Promise<
  { ok: true; record: HandleRecord } | { ok: false; error: string }
> {
  try {
    const h = await prisma.handle.create({
      data: {
        handle: params.handle,
        normalizedHandle: params.normalizedHandle,
        bchAddress: params.bchAddress,
        tokenAddress: params.tokenAddress,
        verified: params.verified,
        status: "active",
      },
    });
    return { ok: true, record: toRecord(h) };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "P2002") {
      return { ok: false, error: "Handle already claimed." };
    }
    return { ok: false, error: "Unable to claim handle. Please try again." };
  }
}

export async function updateHandle(
  normalized: string,
  updates: Partial<
    Pick<
      HandleRecord,
      "displayName" | "bio" | "bchAddress" | "tokenAddress" | "verified"
    >
  >
): Promise<HandleRecord | null> {
  try {
    const h = await prisma.handle.update({
      where: { normalizedHandle: normalized },
      data: updates,
    });
    return toRecord(h);
  } catch {
    return null;
  }
}

export async function saveChallenge(challenge: ChallengeType): Promise<void> {
  await prisma.challenge.upsert({
    where: { id: challenge.id },
    create: {
      id: challenge.id,
      action: challenge.action,
      handle: challenge.handle,
      address: challenge.address,
      nonce: challenge.nonce,
      text: challenge.text,
      timestamp: challenge.timestamp,
      expiration: challenge.expiration,
    },
    update: {
      text: challenge.text,
      expiration: challenge.expiration,
    },
  });
}

export async function getChallenge(
  id: string
): Promise<ChallengeType | null> {
  try {
    const c = await prisma.challenge.findUnique({ where: { id } });
    if (!c) return null;
    if (Math.floor(Date.now() / 1000) > c.expiration) {
      await prisma.challenge.delete({ where: { id } }).catch(() => {});
      return null;
    }
    return {
      id: c.id,
      action: c.action as ChallengeType["action"],
      handle: c.handle,
      address: c.address,
      nonce: c.nonce,
      timestamp: c.timestamp,
      expiration: c.expiration,
      text: c.text,
    };
  } catch {
    return null;
  }
}

export async function consumeChallenge(id: string): Promise<void> {
  await prisma.challenge.delete({ where: { id } }).catch(() => {});
}

export async function listHandles(limit = 50): Promise<HandleRecord[]> {
  try {
    const rows = await prisma.handle.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRecord);
  } catch {
    return [];
  }
}

/** Lightweight connectivity check for /api/health */
export async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
