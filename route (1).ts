import { NextRequest, NextResponse } from "next/server";
import { validateHandle } from "@/lib/handles";
import { isHandleAvailable, findHandleByNormalized } from "@/lib/database";
import { rateLimit, getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`handles:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const handleParam = req.nextUrl.searchParams.get("handle");
  if (!handleParam) {
    return NextResponse.json(
      { error: "Missing handle parameter" },
      { status: 400 }
    );
  }

  const validation = validateHandle(handleParam);
  if (!validation.ok) {
    return NextResponse.json(
      { available: false, error: validation.error },
      { status: 400 }
    );
  }

  const available = await isHandleAvailable(validation.normalized);
  if (!available) {
    return NextResponse.json({
      available: false,
      error: "Handle already claimed",
    });
  }

  return NextResponse.json({
    available: true,
    normalized: validation.normalized,
  });
}

export async function POST(req: NextRequest) {
  // Resolution endpoint (for future embed / lookup)
  try {
    const body = await req.json();
    const handle = body?.handle;
    if (!handle) {
      return NextResponse.json({ error: "Missing handle" }, { status: 400 });
    }
    const validation = validateHandle(handle);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const record = await findHandleByNormalized(validation.normalized);
    if (!record) {
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
    }
    return NextResponse.json({
      handle: record.normalizedHandle,
      bchAddress: record.bchAddress,
      tokenAddress: record.tokenAddress,
      verified: record.verified,
      displayName: record.displayName,
      bio: record.bio,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
