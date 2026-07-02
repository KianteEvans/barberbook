import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import Stripe from "stripe";
import { db, isSlotTakenError } from "@/db/client";
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  barberServices,
  payments,
  recurringSeries,
  seriesOccurrences,
  services,
  users,
} from "@/db/schema";
import { computeDeposit } from "@/domain/payments/deposit";
import { effectivePricing } from "@/domain/barbers/pricing";
import { loadSettings } from "@/domain/booking/load";
import { NotFoundError } from "@/domain/errors";
import { paymentsEnabled } from "@/env";
import { stripe } from "@/stripe/client";
import { expandSeries, hasConflict, proposeAlternative, wallTimeToUtc } from "./series";

/**
 * Recurring-series persistence + the materialization engine. Materialization
 * is idempotent: (series_id, scheduled_date) is unique, so re-running the
 * cron only creates the occurrences that are missing.
 */

export const HORIZON_WEEKS = 8;
/** Off-session deposits get a generous hold; a human resolves failures. */
const SERIES_HOLD_DAYS = 7;

export async function createSeriesOp({
  clientId,
  barberId,
  serviceId,
  cadenceWeeks,
  anchorStartUtc,
}: {
  clientId: string;
  barberId: string;
  serviceId: string;
  cadenceWeeks: number;
  anchorStartUtc: Date;
}): Promise<string> {
  const settings = await loadSettings();
  const local = toZonedTime(anchorStartUtc, settings.timezone);
  const anchorDate = format(local, "yyyy-MM-dd");
  const timeMin = local.getHours() * 60 + local.getMinutes();

  const [row] = await db
    .insert(recurringSeries)
    .values({
      clientId,
      barberId,
      serviceId,
      cadenceWeeks,
      weekday: local.getDay(),
      timeMin,
      anchorDate,
      nextHorizonDate: anchorDate,
      status: "active",
    })
    .returning({ id: recurringSeries.id });
  if (!row) throw new Error("series insert failed");
  return row.id;
}

export interface MaterializeSummary {
  booked: number;
  conflicts: number;
  chargeFailures: number;
}

/** Materialize all active series out to the rolling horizon. */
export async function materializeAllSeries(
  now = new Date(),
): Promise<MaterializeSummary> {
  const settings = await loadSettings();
  const today = format(toZonedTime(now, settings.timezone), "yyyy-MM-dd");
  const horizonDate = format(
    addDays(new Date(`${today}T12:00:00Z`), HORIZON_WEEKS * 7),
    "yyyy-MM-dd",
  );

  const active = await db
    .select()
    .from(recurringSeries)
    .where(
      and(
        eq(recurringSeries.status, "active"),
        lt(recurringSeries.nextHorizonDate, horizonDate),
      ),
    );

  const summary: MaterializeSummary = { booked: 0, conflicts: 0, chargeFailures: 0 };
  for (const series of active) {
    await materializeSeries(series, today, horizonDate, settings.timezone, summary);
  }
  return summary;
}

type SeriesRow = typeof recurringSeries.$inferSelect;

async function materializeSeries(
  series: SeriesRow,
  today: string,
  horizonDate: string,
  timezone: string,
  summary: MaterializeSummary,
): Promise<void> {
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, series.serviceId));
  if (!service) return;
  const settings = await loadSettings();
  // Apply the barber's price override when one exists. A pair removed after
  // series creation must NOT strand the standing appointment - fall back to
  // the shop price instead of rejecting.
  const [offering] = await db
    .select({ priceCents: barberServices.priceCents })
    .from(barberServices)
    .where(
      and(
        eq(barberServices.barberId, series.barberId),
        eq(barberServices.serviceId, series.serviceId),
      ),
    );
  const { depositCents, remainderCents } = computeDeposit(
    effectivePricing(service, offering?.priceCents ?? null),
    settings,
  );

  // Expand from the LATER of today and the already-materialized horizon so
  // occurrences are never re-created after cancellation.
  const fromDate = series.nextHorizonDate > today ? series.nextHorizonDate : today;
  const occurrences = expandSeries({
    spec: {
      anchorDate: series.anchorDate,
      cadenceWeeks: series.cadenceWeeks,
      timeMin: series.timeMin,
    },
    fromDate,
    horizonDate,
    timezone,
  });

  for (const occ of occurrences) {
    // Unique (series_id, scheduled_date) makes replays no-ops.
    const inserted = await db
      .insert(seriesOccurrences)
      .values({ seriesId: series.id, scheduledDate: occ.date, status: "booked" })
      .onConflictDoNothing()
      .returning({ id: seriesOccurrences.id });
    const occurrence = inserted[0];
    if (!occurrence) continue;

    const endUtc = new Date(occ.startUtc.getTime() + service.durationMin * 60_000);
    const online = paymentsEnabled && depositCents > 0;

    let appointmentId: string | null = null;
    try {
      const [appt] = await db
        .insert(appointments)
        .values({
          clientId: series.clientId,
          barberId: series.barberId,
          serviceId: series.serviceId,
          startAt: occ.startUtc,
          endAt: endUtc,
          status: online ? "pending_deposit" : "confirmed",
          holdExpiresAt: online
            ? new Date(Date.now() + SERIES_HOLD_DAYS * 86_400_000)
            : null,
          depositCents,
          remainderCents,
        })
        .returning({ id: appointments.id });
      appointmentId = appt?.id ?? null;
    } catch (err) {
      if (!isSlotTakenError(err)) throw err;
      const note = await conflictNote(series, occ.date, service.durationMin, timezone);
      await db
        .update(seriesOccurrences)
        .set({ status: "conflict", note })
        .where(eq(seriesOccurrences.id, occurrence.id));
      summary.conflicts += 1;
      continue;
    }
    if (!appointmentId) continue;

    await db
      .update(seriesOccurrences)
      .set({ appointmentId })
      .where(eq(seriesOccurrences.id, occurrence.id));

    if (!online) {
      summary.booked += 1;
      continue;
    }

    const charge = await chargeSeriesDeposit(series, appointmentId, depositCents);
    if (charge.ok) {
      summary.booked += 1;
    } else {
      await db
        .update(seriesOccurrences)
        .set({ status: "charge_failed", note: charge.message })
        .where(eq(seriesOccurrences.id, occurrence.id));
      summary.chargeFailures += 1;
    }
  }

  await db
    .update(recurringSeries)
    .set({ nextHorizonDate: horizonDate })
    .where(eq(recurringSeries.id, series.id));
}

/** Describe the conflict and the nearest same-day alternative, if any. */
async function conflictNote(
  series: SeriesRow,
  date: string,
  durationMin: number,
  timezone: string,
): Promise<string> {
  const settings = await loadSettings();
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [rule] = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.barberId, series.barberId),
        eq(availabilityRules.weekday, weekday),
      ),
    );
  const [exception] = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.barberId, series.barberId),
        eq(availabilityExceptions.date, date),
      ),
    );
  const window = exception
    ? exception.kind === "off"
      ? null
      : { startMin: exception.startMin ?? 0, endMin: exception.endMin ?? 0 }
    : rule
      ? { startMin: rule.startMin, endMin: rule.endMin }
      : null;
  if (!window) return "Slot taken; the barber is off that day.";

  const dayStart = wallTimeToUtc(date, 0, timezone);
  const dayEnd = wallTimeToUtc(date, 1440, timezone);
  const busy = await db
    .select({ startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, series.barberId),
        inArray(appointments.status, ["pending_deposit", "confirmed"]),
        gte(appointments.startAt, dayStart),
        lt(appointments.startAt, dayEnd),
      ),
    );

  const alt = proposeAlternative({
    date,
    preferredMin: series.timeMin,
    durationMin,
    granularityMin: settings.slotGranularityMin,
    dayStartMin: window.startMin,
    dayEndMin: window.endMin,
    busy,
    timezone,
  });
  if (!alt) return "Slot taken; no same-day opening.";
  const hh = Math.floor(alt.startMin / 60);
  const mm = String(alt.startMin % 60).padStart(2, "0");
  const h12 = ((hh + 11) % 12) + 1;
  return `Slot taken; nearest opening ${h12}:${mm} ${hh >= 12 ? "PM" : "AM"}.`;
}

async function chargeSeriesDeposit(
  series: SeriesRow,
  appointmentId: string,
  depositCents: number,
): Promise<{ ok: boolean; message: string }> {
  const [client] = await db
    .select()
    .from(users)
    .where(eq(users.id, series.clientId));
  const pm = series.stripePaymentMethodId;
  if (!client?.stripeCustomerId || !pm) {
    return { ok: false, message: "No saved card for this series." };
  }
  try {
    const pi = await stripe().paymentIntents.create({
      amount: depositCents,
      currency: "usd",
      customer: client.stripeCustomerId,
      payment_method: pm,
      off_session: true,
      confirm: true,
      description: "Recurring appointment deposit",
      metadata: { appointmentId, kind: "series_deposit" },
    });
    await db
      .update(appointments)
      .set({ status: "confirmed", holdExpiresAt: null, stripePaymentIntentId: pi.id })
      .where(eq(appointments.id, appointmentId));
    await db.insert(payments).values({
      appointmentId,
      clientId: series.clientId,
      type: "deposit",
      amountCents: depositCents,
      status: "succeeded",
      stripePaymentIntentId: pi.id,
    });
    return { ok: true, message: "charged" };
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeError
        ? (err.message ?? err.code ?? "card error")
        : "unexpected error";
    await db.insert(payments).values({
      appointmentId,
      clientId: series.clientId,
      type: "deposit",
      amountCents: depositCents,
      status: "failed",
      failureMessage: message,
    });
    return { ok: false, message };
  }
}

/** Pause/resume/cancel. Cancel releases future booked occurrences. */
export async function setSeriesStatusOp({
  seriesId,
  clientId,
  status,
}: {
  seriesId: string;
  /** Enforce ownership for client-initiated changes; admin passes null. */
  clientId: string | null;
  status: "active" | "paused" | "canceled";
}): Promise<void> {
  const where = clientId
    ? and(eq(recurringSeries.id, seriesId), eq(recurringSeries.clientId, clientId))
    : eq(recurringSeries.id, seriesId);
  const [series] = await db.select().from(recurringSeries).where(where);
  if (!series) throw new NotFoundError("Series not found.");

  await db
    .update(recurringSeries)
    .set({ status })
    .where(eq(recurringSeries.id, seriesId));

  if (status === "canceled") {
    // Release future appointments created by this series (not the anchor).
    const future = await db
      .select({ appointmentId: seriesOccurrences.appointmentId })
      .from(seriesOccurrences)
      .where(eq(seriesOccurrences.seriesId, seriesId));
    const ids = future
      .map((o) => o.appointmentId)
      .filter((id): id is string => id !== null);
    if (ids.length > 0) {
      await db
        .update(appointments)
        .set({ status: "canceled", canceledAt: new Date() })
        .where(
          and(
            inArray(appointments.id, ids),
            inArray(appointments.status, ["pending_deposit", "confirmed"]),
            gte(appointments.startAt, new Date()),
          ),
        );
    }
  }
}
