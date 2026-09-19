"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getIdentity, type Identity } from "@/auth/session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ForbiddenError } from "@/domain/errors";
import { resolveBarberForUser } from "@/domain/chair/operations";
import { loadSettings } from "@/domain/booking/load";
import { canSelfJoin } from "./selfjoin";
import {
  addWalkinOp,
  bookWalkinSlotOp,
  callNextWalkinOp,
  countWaiting,
  leaveByTokenOp,
  phoneInLine,
  resolveWalkinOp,
  startWalkinOp,
} from "./operations";

/**
 * Walk-in queue mutations. Staff only: an admin manages any entry; a barber
 * acts on their OWN chair (derived from the session, never from the form).
 */

async function requireStaff(): Promise<Identity> {
  const identity = await getIdentity();
  if (identity.role !== "admin" && identity.role !== "barber") {
    throw new ForbiddenError();
  }
  return identity;
}

/** The acting barber's chair id, or null for an admin. */
async function actingChair(identity: Identity): Promise<string | null> {
  if (identity.role === "admin") return null;
  const barber = await resolveBarberForUser(identity.userId);
  if (!barber) throw new ForbiddenError();
  return barber.id;
}

function refresh(): void {
  revalidatePath("/admin/walkins");
  revalidatePath("/chair");
  revalidatePath("/queue");
}

const addSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  phone: z.string().trim().max(30).optional(),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  barberId: z.string().uuid().optional().or(z.literal("")),
});

export async function addWalkinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const input = parseOrThrow(addSchema, formObject(formData));
    const ownChair = await actingChair(identity);
    await addWalkinOp({
      name: input.name,
      phone: input.phone || null,
      serviceId: input.serviceId || null,
      // A barber always queues onto their own chair; admin may pick or leave
      // it "first available".
      barberId: ownChair ?? (input.barberId || null),
    });
    refresh();
    return { ok: true, detail: `${input.name} added to the line.` };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const selfJoinSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(60),
  phone: z.string().trim().max(30).optional(),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  barberId: z.string().uuid().optional().or(z.literal("")),
  /** Honeypot: humans leave this empty; bots fill every field. */
  website: z.string().max(0).optional(),
});

/**
 * PUBLIC, unauthenticated: a client puts themselves in the walk-in line.
 * Deliberately does NOT call requireStaff. Every refusal reason lives in the
 * pure `canSelfJoin` gate; we return the client-safe message from it.
 */
export async function joinQueueSelfAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let redirectTo: string;
  try {
    const input = parseOrThrow(selfJoinSchema, formObject(formData));
    // A filled honeypot is a bot: look like success, write nothing.
    if (input.website) return { ok: true, detail: "You're in the line." };

    const settings = await loadSettings();
    const phone = input.phone || null;
    const decision = canSelfJoin({
      enabled: settings.selfJoinEnabled,
      waitingCount: await countWaiting(),
      maxWaiting: settings.queueMaxWaiting,
      alreadyInLine: phone ? await phoneInLine(phone) : false,
    });
    if (!decision.ok) return { ok: false, error: decision.message };

    const { joinToken } = await addWalkinOp({
      name: input.name,
      phone,
      serviceId: input.serviceId || null,
      barberId: input.barberId || null,
      source: "self",
    });
    refresh();
    redirectTo = `/queue/${joinToken}`;
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
  // Outside the try: redirect() signals by throwing.
  redirect(redirectTo);
}

const leaveSchema = z.object({ token: z.string().uuid() });

/** PUBLIC: a client drops out of the line with their own token. */
export async function leaveQueueSelfAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const input = parseOrThrow(leaveSchema, formObject(formData));
    const left = await leaveByTokenOp(input.token);
    refresh();
    return left
      ? { ok: true, detail: "You're out of the line. Come back any time." }
      : { ok: false, error: "You're no longer waiting in the line." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

/** Barber-only: claim the next walk-in (own chair or "first available"). */
export async function callNextWalkinAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const ownChair = await actingChair(identity);
    if (!ownChair) throw new ForbiddenError();
    const claimed = await callNextWalkinOp(ownChair);
    refresh();
    return claimed
      ? { ok: true, detail: `${claimed.name} is up - they've been texted if they left a number.` }
      : { ok: true, detail: "Nobody is waiting right now." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const bookSlotSchema = z.object({
  walkinId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

/** Barber-only: book a waiting walk-in into a slot on their own calendar. */
export async function bookWalkinSlotAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const ownChair = await actingChair(identity);
    if (!ownChair) throw new ForbiddenError();
    const input = parseOrThrow(bookSlotSchema, formObject(formData));
    await bookWalkinSlotOp({
      walkinId: input.walkinId,
      barberId: ownChair,
      serviceId: input.serviceId,
      startAt: new Date(input.startAt),
    });
    refresh();
    revalidatePath("/admin/calendar");
    return { ok: true, detail: "Booked - they're on your calendar now." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const startSchema = z.object({
  id: z.string().uuid(),
  barberId: z.string().uuid(),
});

/** Admin: start a specific waiting entry on a chosen chair. */
export async function startWalkinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    if (identity.role !== "admin") throw new ForbiddenError();
    const input = parseOrThrow(startSchema, formObject(formData));
    await startWalkinOp(input.id, input.barberId);
    refresh();
    return { ok: true, detail: "Walk-in started." };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}

const resolveSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(["done", "no_show", "canceled"]),
});

export async function resolveWalkinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const identity = await requireStaff();
    const input = parseOrThrow(resolveSchema, formObject(formData));
    const ownChair = await actingChair(identity);
    await resolveWalkinOp(input.id, input.outcome, ownChair);
    refresh();
    const label =
      input.outcome === "done"
        ? "Marked done."
        : input.outcome === "no_show"
          ? "Marked no-show."
          : "Removed from the line.";
    return { ok: true, detail: label };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
