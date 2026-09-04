/**
 * Database layer — Prisma + SQLite.
 * Set DATABASE_URL="file:./dev.db" in .env
 * Then: npx prisma generate && npx prisma db push
 */

import { PrismaClient } from "@prisma/client";
import type { Challenge as ChallengeType } from "./verification";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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

function toRecord(h: any): HandleRecord {
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
  const h = await prisma.handle.findUnique({
    where: { normalizedHandle: normalized },
  });
  return h ? toRecord(h) : null;
}

export async function isHandleAvailable(normalized: string): Promise<boolean> {
  const count = await prisma.handle.count({
    where: { normalizedHandle: normalized },
  });
  return count === 0;
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
  } catch (e: any) {
    if (e?.code === "P2002") {
      return { ok: false, error: "Handle already claimed." };
    }
    throw e;
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
}

export async function consumeChallenge(id: string): Promise<void> {
  await prisma.challenge.delete({ where: { id } }).catch(() => {});
}

export async function listHandles(limit = 50): Promise<HandleRecord[]> {
  const rows = await prisma.handle.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecord);
}
