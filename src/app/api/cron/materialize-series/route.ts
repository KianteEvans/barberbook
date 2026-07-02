import { NextResponse } from "next/server";
import { authorizeCron } from "@/domain/cron";
import { materializeAllSeries } from "@/domain/series/operations";

/**
 * Roll every active recurring series forward to the 8-week horizon: book
 * occurrences (the exclusion constraint arbitrates conflicts) and charge
 * deposits off-session. Run daily from any external scheduler.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await materializeAllSeries();
  return NextResponse.json({ ok: true, ...summary });
}
