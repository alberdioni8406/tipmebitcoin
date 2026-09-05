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
  classifySignatureInput,
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
          { error: "This handle was claimed by someone else. Choose another handle." },
          { status: 409 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Something went wrong on the server. Your BCH has not been spent." },
        { status: 503 }
      );
    }

    const bchVal = validateBchAddress(String(body.bchAddress || ""));
    if (!bchVal.ok) {
      return NextResponse.json({ error: bchVal.error }, { status: 400 });
    }

    // Deterministic token binding: null means TOKEN_ADDRESS: NONE in message
    let tokenNormalized: string | null = null;
    if (body.tokenAddress && String(body.tokenAddress).trim()) {
      const tokenVal = validateTokenAddress(String(body.tokenAddress));
      if (!tokenVal.ok) {
        return NextResponse.json(
          { error: tokenVal.error || "The CashToken address is invalid." },
          { status: 400 }
        );
      }
      tokenNormalized = tokenVal.address.normalized;
    }

    const challenge = createChallenge(
      "CLAIM",
      handleVal.normalized,
      bchVal.address.normalized,
      tokenNormalized
    );

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
        handle: challenge.handle,
        address: challenge.address,
        tokenAddress: challenge.tokenAddress,
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

    const shape = classifySignatureInput(signature);
    if (!shape.ok) {
      return NextResponse.json({ error: shape.error }, { status: 400 });
    }

    const challenge = await getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "This claim request expired or was not found. Generate a new one.",
        },
        { status: 400 }
      );
    }
    if (isChallengeExpired(challenge)) {
      await consumeChallenge(challengeId);
      return NextResponse.json(
        { error: "This claim request expired. Generate a new one." },
        { status: 400 }
      );
    }

    const available = await isHandleAvailable(challenge.handle);
    if (!available) {
      await consumeChallenge(challengeId);
      return NextResponse.json(
        {
          error:
            "This handle was claimed by someone else. Choose another handle.",
        },
        { status: 409 }
      );
    }

    // Verify against the EXACT persisted challenge text (includes TOKEN_ADDRESS)
    const sigResult = await verifyMessageSignature(
      challenge.address,
      challenge.text,
      signature
    );

    if (!sigResult.valid) {
      return NextResponse.json(
        {
          error:
            sigResult.error ||
            "Invalid message signature. Make sure your wallet used Sign Message, not Sign Transaction.",
        },
        { status: 400 }
      );
    }

    // Token address comes ONLY from the persisted challenge — never from the client
    const result = await claimHandle({
      handle: challenge.handle,
      normalizedHandle: challenge.handle,
      bchAddress: challenge.address,
      tokenAddress: challenge.tokenAddress,
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
