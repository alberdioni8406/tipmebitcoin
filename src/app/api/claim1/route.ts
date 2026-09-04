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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`claims:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as string;

  if (action === "start") {
    const handleVal = validateHandle(body.handle || "");
    if (!handleVal.ok) {
      return NextResponse.json({ error: handleVal.error }, { status: 400 });
    }

    const available = await isHandleAvailable(handleVal.normalized);
    if (!available) {
      return NextResponse.json(
        { error: "Handle already claimed" },
        { status: 409 }
      );
    }

    const bchVal = validateBchAddress(body.bchAddress || "");
    if (!bchVal.ok) {
      return NextResponse.json({ error: bchVal.error }, { status: 400 });
    }

    let tokenNormalized: string | null = null;
    if (body.tokenAddress && String(body.tokenAddress).trim()) {
      const tokenVal = validateTokenAddress(body.tokenAddress);
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
    await saveChallenge(challenge);

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        text: challenge.text,
        expiration: challenge.expiration,
      },
    });
  }

  if (action === "verify") {
    const challengeId = body.challengeId as string;
    const signature = sanitizeText(body.signature || "", 500);

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

    // Re-validate handle still free
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

    // Optional token address from original start (re-sent by client)
    let tokenNormalized: string | null = null;
    if (body.tokenAddress && String(body.tokenAddress).trim()) {
      const tokenVal = validateTokenAddress(body.tokenAddress);
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
