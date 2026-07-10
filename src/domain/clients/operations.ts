import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  appointments,
  barbers,
  clientNotes,
  payments,
  services,
  users,
} from "@/db/schema";
import { NotFoundError } from "@/domain/errors";

/** Admin/staff client CRM reads. */

export interface ClientListRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly completedCount: number;
  readonly noShowCount: number;
  readonly lastVisitAt: Date | null;
}

/** All client-role users with lightweight visit stats, most-recent first. */
export async function loadClientList(): Promise<ClientListRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      completedCount: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
      noShowCount: sql<number>`count(*) filter (where ${appointments.status} = 'no_show')::int`,
      lastVisitAt: sql<Date | null>`max(${appointments.startAt}) filter (where ${appointments.status} = 'completed')`,
    })
    .from(users)
    .leftJoin(appointments, eq(appointments.clientId, users.id))
    .where(eq(users.role, "client"))
    .groupBy(users.id)
    .orderBy(desc(sql`max(${appointments.startAt})`));
  return rows;
}

export interface ClientVisit {
  readonly id: string;
  readonly startAt: Date;
  readonly status: string;
  readonly serviceName: string;
  readonly barberName: string;
  readonly valueCents: number;
}

export interface ClientNote {
  readonly id: string;
  readonly body: string;
  readonly authorName: string | null;
  readonly createdAt: Date;
}

export interface ClientProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly memberSince: Date;
  readonly completedCount: number;
  readonly noShowCount: number;
  readonly upcomingCount: number;
  readonly totalSpendCents: number;
  readonly preferredBarber: string | null;
  readonly visits: ClientVisit[];
  readonly notes: ClientNote[];
}

/** Full CRM profile: contact, stats, preferred barber, history, and notes. */
export async function loadClientProfile(
  clientId: string,
  now = new Date(),
): Promise<ClientProfile> {
  const [client] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      memberSince: users.createdAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, clientId));
  if (!client || client.role !== "client") {
    throw new NotFoundError("Client not found.");
  }

  const visitRows = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      status: appointments.status,
      serviceName: services.name,
      barberName: barbers.displayName,
      depositCents: appointments.depositCents,
      remainderCents: appointments.remainderCents,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(eq(appointments.clientId, clientId))
    .orderBy(desc(appointments.startAt))
    .limit(50);

  const visits: ClientVisit[] = visitRows.map((v) => ({
    id: v.id,
    startAt: v.startAt,
    status: v.status,
    serviceName: v.serviceName,
    barberName: v.barberName,
    valueCents: v.depositCents + v.remainderCents,
  }));

  const completedCount = visits.filter((v) => v.status === "completed").length;
  const noShowCount = visits.filter((v) => v.status === "no_show").length;
  const upcomingCount = visits.filter(
    (v) =>
      v.startAt.getTime() >= now.getTime() &&
      (v.status === "confirmed" || v.status === "reserved" || v.status === "pending_deposit"),
  ).length;
  const completedValue = visits
    .filter((v) => v.status === "completed")
    .reduce((s, v) => s + v.valueCents, 0);

  const [tips] = await db
    .select({ cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(
      and(eq(payments.clientId, clientId), eq(payments.type, "tip"), eq(payments.status, "succeeded")),
    );

  // Preferred barber = most completed visits.
  const [pref] = await db
    .select({ name: barbers.displayName, n: sql<number>`count(*)::int` })
    .from(appointments)
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(and(eq(appointments.clientId, clientId), eq(appointments.status, "completed")))
    .groupBy(barbers.displayName)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const noteRows = await db
    .select({
      id: clientNotes.id,
      body: clientNotes.body,
      authorName: users.name,
      createdAt: clientNotes.createdAt,
    })
    .from(clientNotes)
    .leftJoin(users, eq(clientNotes.authorId, users.id))
    .where(eq(clientNotes.clientId, clientId))
    .orderBy(desc(clientNotes.createdAt));

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    memberSince: client.memberSince,
    completedCount,
    noShowCount,
    upcomingCount,
    totalSpendCents: completedValue + (tips?.cents ?? 0),
    preferredBarber: pref?.name ?? null,
    visits,
    notes: noteRows,
  };
}

/** Notes grouped by client id, for a set of clients (chair note popovers). */
export async function loadNotesForClients(
  clientIds: string[],
): Promise<Map<string, ClientNote[]>> {
  const map = new Map<string, ClientNote[]>();
  if (clientIds.length === 0) return map;
  const rows = await db
    .select({
      clientId: clientNotes.clientId,
      id: clientNotes.id,
      body: clientNotes.body,
      authorName: users.name,
      createdAt: clientNotes.createdAt,
    })
    .from(clientNotes)
    .leftJoin(users, eq(clientNotes.authorId, users.id))
    .where(inArray(clientNotes.clientId, clientIds))
    .orderBy(desc(clientNotes.createdAt));
  for (const r of rows) {
    const list = map.get(r.clientId) ?? [];
    list.push({ id: r.id, body: r.body, authorName: r.authorName, createdAt: r.createdAt });
    map.set(r.clientId, list);
  }
  return map;
}
