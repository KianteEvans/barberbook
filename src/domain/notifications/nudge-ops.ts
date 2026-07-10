import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, clientNudges } from "@/db/schema";
import { loadSettings } from "@/domain/booking/load";
import { createNotification } from "./operations";
import { decideNudge, type NudgeKind } from "./nudges";

/** Re-engagement nudge pass, driven from the cron tick. */

const DAY_MS = 86_400_000;
const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / DAY_MS);

const COPY: Record<NudgeKind, { title: string; body: string }> = {
  rebook: {
    title: "Time for a fresh cut?",
    body: "It has been a few weeks since your last visit - book your next appointment and keep your look sharp.",
  },
  winback: {
    title: "We miss you at the shop",
    body: "It has been a while! Come back for a cut - your chair is waiting whenever you are ready.",
  },
};

/**
 * Nudge lapsed clients to rebook. Skips entirely when both thresholds are 0.
 * Dedup + cooldown live in `client_nudges` (one row per client+kind); the pure
 * `decideNudge` picks the nudge, and we upsert last_sent_at after sending.
 */
export async function runNudgePass(now = new Date()): Promise<number> {
  const settings = await loadSettings();
  if (settings.rebookAfterDays <= 0 && settings.winbackAfterDays <= 0) return 0;

  // Last completed visit per client.
  const lastVisits = await db
    .select({
      clientId: appointments.clientId,
      // Raw aggregate comes back as a string; coerce to Date below.
      lastVisit: sql<string>`max(${appointments.startAt})`,
    })
    .from(appointments)
    .where(eq(appointments.status, "completed"))
    .groupBy(appointments.clientId);
  if (lastVisits.length === 0) return 0;

  // Clients who already have something on the books (never nudge them).
  const upcomingRows = await db
    .selectDistinct({ clientId: appointments.clientId })
    .from(appointments)
    .where(
      and(
        inArray(appointments.status, ["confirmed", "reserved", "pending_deposit"]),
        gt(appointments.startAt, now),
      ),
    );
  const hasUpcoming = new Set(upcomingRows.map((r) => r.clientId));

  // Prior nudge sends for cooldown.
  const sentRows = await db
    .select({
      clientId: clientNudges.clientId,
      kind: clientNudges.kind,
      lastSentAt: clientNudges.lastSentAt,
    })
    .from(clientNudges);
  const sentMap = new Map<string, { rebook?: Date; winback?: Date }>();
  for (const r of sentRows) {
    const entry = sentMap.get(r.clientId) ?? {};
    entry[r.kind] = r.lastSentAt;
    sentMap.set(r.clientId, entry);
  }

  let sent = 0;
  for (const row of lastVisits) {
    const prior = sentMap.get(row.clientId) ?? {};
    const kind = decideNudge({
      daysSinceLastVisit: daysBetween(new Date(row.lastVisit), now),
      hasUpcoming: hasUpcoming.has(row.clientId),
      rebookAfterDays: settings.rebookAfterDays,
      winbackAfterDays: settings.winbackAfterDays,
      rebookSentDaysAgo: prior.rebook ? daysBetween(prior.rebook, now) : null,
      winbackSentDaysAgo: prior.winback ? daysBetween(prior.winback, now) : null,
    });
    if (!kind) continue;

    await createNotification(row.clientId, kind, COPY[kind].title, COPY[kind].body);
    await db
      .insert(clientNudges)
      .values({ clientId: row.clientId, kind, lastSentAt: now })
      .onConflictDoUpdate({
        target: [clientNudges.clientId, clientNudges.kind],
        set: { lastSentAt: now },
      });
    sent += 1;
  }
  return sent;
}
