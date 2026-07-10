import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, barbers, reviews, services, users } from "@/db/schema";

/** Reads for post-visit reviews (public + admin moderation). */

export interface ReviewRow {
  readonly id: string;
  readonly authorName: string;
  readonly comment: string | null;
  readonly rating: number;
  readonly barberName: string;
  readonly createdAt: Date;
}

const baseSelect = {
  id: reviews.id,
  authorName: users.name,
  comment: reviews.comment,
  rating: reviews.rating,
  barberName: barbers.displayName,
  createdAt: reviews.createdAt,
};

/** Approved reviews for the public gallery, newest first. */
export async function loadApprovedReviews(): Promise<ReviewRow[]> {
  return db
    .select(baseSelect)
    .from(reviews)
    .innerJoin(users, eq(reviews.clientId, users.id))
    .innerJoin(barbers, eq(reviews.barberId, barbers.id))
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.createdAt));
}

/** Pending reviews awaiting moderation (admin). */
export async function loadPendingReviews(): Promise<ReviewRow[]> {
  return db
    .select(baseSelect)
    .from(reviews)
    .innerJoin(users, eq(reviews.clientId, users.id))
    .innerJoin(barbers, eq(reviews.barberId, barbers.id))
    .where(eq(reviews.status, "pending"))
    .orderBy(desc(reviews.createdAt));
}

export interface ReviewStats {
  readonly count: number;
  readonly average: number; // 0 when none
}

/** Average approved rating + count, for the gallery header. */
export async function approvedReviewStats(): Promise<ReviewStats> {
  const rows = await db
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(eq(reviews.status, "approved"));
  if (rows.length === 0) return { count: 0, average: 0 };
  const sum = rows.reduce((s, r) => s + r.rating, 0);
  return { count: rows.length, average: sum / rows.length };
}

/** Does this client already have a review for this appointment? */
export async function hasReview(appointmentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.appointmentId, appointmentId));
  return row !== undefined;
}

/** A completed appointment the given client owns, eligible for review. */
export async function loadReviewableAppointment(
  appointmentId: string,
  clientId: string,
): Promise<{ id: string; barberId: string; serviceName: string; barberName: string } | null> {
  const [row] = await db
    .select({
      id: appointments.id,
      barberId: appointments.barberId,
      serviceName: services.name,
      barberName: barbers.displayName,
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(barbers, eq(appointments.barberId, barbers.id))
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.clientId, clientId),
        eq(appointments.status, "completed"),
      ),
    );
  return row ?? null;
}
