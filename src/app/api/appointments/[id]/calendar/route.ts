import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, services } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { loadSettings } from "@/domain/booking/load";
import { toIcs } from "@/domain/booking/ics";

/** Download an appointment as an .ics file ("Add to calendar"). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const identity = await tryGetIdentity();
  if (!identity) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const where =
    identity.role === "admin"
      ? eq(appointments.id, id)
      : and(eq(appointments.id, id), eq(appointments.clientId, identity.userId));
  const [appt] = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(where);
  if (!appt) return new Response("not_found", { status: 404 });

  const settings = await loadSettings();
  const ics = toIcs({
    uid: appt.id,
    start: appt.startAt,
    end: appt.endAt,
    summary: `${appt.serviceName} with ${appt.barberName}`,
    location: settings.shopName,
    description: `${appt.serviceName} with ${appt.barberName} at ${settings.shopName}.`,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="appointment.ics"',
    },
  });
}
