import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Returns application + database status. Never exposes secrets.
 */
export async function GET() {
  const dbOk = await checkDatabase();

  if (!dbOk) {
    return NextResponse.json(
      {
        status: "degraded",
        app: "tipmebitcoin",
        database: "unavailable",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    app: "tipmebitcoin",
    database: "connected",
  });
}
