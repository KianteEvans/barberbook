import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  barbers,
  services,
  shopSettings,
} from "@/db/schema";
import { generateSlots, type Slot } from "@/domain/slots/slots";
import { NotFoundError } from "@/domain/errors";

/** Read-side loaders for the public booking flow. */

export interface ShopSettingsRow {
  readonly id: number;
  readonly shopName: string;
  readonly timezone: string;
  readonly cancellationWindowHours: number;
  readonly depositMode: "fixed" | "percent";
  readonly depositValue: number;
  readonly noShowFeeCents: number;
  readonly slotGranularityMin: number;
  readonly bufferMin: number;
}

export async function loadSettings(): Promise<ShopSettingsRow> {
  const [row] = await db.select().from(shopSettings);
  if (!row) throw new NotFoundError("Shop is not configured yet.");
  return row;
}

export async function loadActiveServices() {
  return db.select().from(services).where(eq(services.active, true));
}

export async function loadActiveBarbers() {
  return db.select().from(barbers).where(eq(barbers.active, true));
}

/** UTC range covering one shop-local calendar day. */
export function dayRangeUtc(
  date: string,
  timezone: string,
): { start: Date; end: Date } {
  const start = fromZonedTime(`${date} 00:00:00`, timezone);
  const nextDate = format(addDays(new Date(`${date}T12:00:00Z`), 1), "yyyy-MM-dd");
  const end = fromZonedTime(`${nextDate} 00:00:00`, timezone);
  return { start, end };
}

/** Today's date (YYYY-MM-DD) in the shop timezone. */
export function todayInShopTz(timezone: string, now = new Date()): string {
  return format(toZonedTime(now, timezone), "yyyy-MM-dd");
}

export async function loadSlotsForDay({
  barberId,
  serviceId,
  date,
  now = new Date(),
}: {
  barberId: string;
  serviceId: string;
  date: string;
  now?: Date;
}): Promise<Slot[]> {
  const settings = await loadSettings();
  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service) throw new NotFoundError("Service not found.");

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.barberId, barberId));
  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.barberId, barberId),
        eq(availabilityExceptions.date, date),
      ),
    );

  const { start, end } = dayRangeUtc(date, settings.timezone);
  const busy = await db
    .select({ startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, barberId),
        inArray(appointments.status, ["pending_deposit", "confirmed"]),
        gte(appointments.startAt, start),
        lt(appointments.startAt, end),
      ),
    );

  return generateSlots({
    date,
    rules,
    exceptions: exceptions.map((e) => ({
      date: e.date,
      kind: e.kind,
      startMin: e.startMin,
      endMin: e.endMin,
    })),
    existing: busy,
    serviceDurationMin: service.durationMin,
    bufferMin: settings.bufferMin,
    granularityMin: settings.slotGranularityMin,
    timezone: settings.timezone,
    now,
  });
}
