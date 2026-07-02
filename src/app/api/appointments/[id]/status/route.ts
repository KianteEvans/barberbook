import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";

/** Status poll for the booking confirmation page (webhook may lag redirect). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const identity = await tryGetIdentity();
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const where =
    identity.role === "admin"
      ? eq(appointments.id, id)
      : and(eq(appointments.id, id), eq(appointments.clientId, identity.userId));
  const [appt] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(where);
  if (!appt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: appt.status });
}
