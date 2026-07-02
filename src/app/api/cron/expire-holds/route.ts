import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments } from "@/db/schema";
import { authorizeCron } from "@/domain/cron";

/**
 * Release expired deposit holds: pending_deposit rows whose hold_expires_at
 * has passed become canceled, freeing the slot (the exclusion constraint only
 * covers pending/confirmed). A payment that lands after this is auto-refunded
 * by the checkout.session.completed handler.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const released = await db
    .update(appointments)
    .set({ status: "canceled", canceledAt: now })
    .where(
      and(
        eq(appointments.status, "pending_deposit"),
        lt(appointments.holdExpiresAt, now),
      ),
    )
    .returning({ id: appointments.id });

  return NextResponse.json({ ok: true, released: released.length });
}
