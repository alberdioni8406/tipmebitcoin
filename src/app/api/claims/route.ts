import { NextRequest, NextResponse } from "next/server";
import { validateHandle } from "@/lib/handles";
import {
  validateBchAddress,
  validateTokenAddress,
} from "@/lib/addresses";
import {
  createChallenge,
  isChallengeExpired,
  verifyMessageSignature,
} from "@/lib/verification";
import {
  isHandleAvailable,
  claimHandle,
  saveChallenge,
  getChallenge,
  consumeChallenge,
} from "@/lib/database";
import { rateLimit, getClientIp, sanitizeText } from "@/lib/security";

export const dynamic = "force-dynamic";

/** POST /api/claims — start challenge or verify signature + claim */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`claims:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as string;

  if (action === "start") {
    const handleVal = validateHandle(String(body.handle || ""));
    if (!handleVal.ok) {
      return NextResponse.json({ error: handleVal.error }, { status: 400 });
    }

    try {
      const available = await isHandleAvailable(handleVal.normalized);
      if (!available) {
        return NextResponse.json(
          { error: "Handle already claimed" },
          { status: 409 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const bchVal = validateBchAddress(String(body.bchAddress || ""));
    if (!bchVal.ok) {
      return NextResponse.json({ error: bchVal.error }, { status: 400 });
    }

    let tokenNormalized: string | null = null;
    if (body.tokenAddress && String(body.tokenAddress).trim()) {
      const tokenVal = validateTokenAddress(String(body.tokenAddress));
      if (!tokenVal.ok) {
        return NextResponse.json({ error: tokenVal.error }, { status: 400 });
      }
      tokenNormalized = tokenVal.address.normalized;
    }

    const challenge = createChallenge(
      "CLAIM",
      handleVal.normalized,
      bchVal.address.normalized
    );

    void tokenNormalized;

    try {
      await saveChallenge(challenge);
    } catch {
      return NextResponse.json(
        { error: "Unable to create challenge. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        text: challenge.text,
        expiration: challenge.expiration,
      },
    });
  }

  if (action === "verify") {
    const challengeId = String(body.challengeId || "");
    const signature = sanitizeText(String(body.signature || ""), 500);

    if (!challengeId || !signature) {
      return NextResponse.json(
        { error: "Missing challengeId or signature" },
        { status: 400 }
      );
    }

    const challenge = await getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found or expired" },
        { status: 400 }
      );
    }
    if (isChallengeExpired(challenge)) {
      await consumeChallenge(challengeId);
      return NextResponse.json(
        { error: "Challenge expired" },
        { status: 400 }
      );
    }

    const available = await isHandleAvailable(challenge.handle);
    if (!available) {
      await consumeChallenge(challengeId);
      return NextResponse.json(
        { error: "Handle already claimed" },
        { status: 409 }
      );
    }

    const sigResult = await verifyMessageSignature(
      challenge.address,
      challenge.text,
      signature
    );

    if (!sigResult.valid) {
      return NextResponse.json(
        { error: sigResult.error || "Invalid signature" },
        { status: 400 }
      );
    }

    let tokenNormalized: string | null = null;
    if (body.tokenAddress && String(body.tokenAddress).trim()) {
      const tokenVal = validateTokenAddress(String(body.tokenAddress));
      if (tokenVal.ok) tokenNormalized = tokenVal.address.normalized;
    }

    const result = await claimHandle({
      handle: challenge.handle,
      normalizedHandle: challenge.handle,
      bchAddress: challenge.address,
      tokenAddress: tokenNormalized,
      verified: true,
    });

    await consumeChallenge(challengeId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      handle: result.record.normalizedHandle,
      verified: true,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
