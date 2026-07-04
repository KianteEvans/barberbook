import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers, testimonials } from "@/db/schema";

/** Read-side loaders for customer testimonials. */

export interface TestimonialRow {
  readonly id: string;
  readonly authorName: string;
  readonly quote: string;
  readonly rating: number | null;
  readonly barberId: string | null;
  readonly barberName: string | null;
  readonly featured: boolean;
  readonly sortOrder: number;
}

const baseSelect = {
  id: testimonials.id,
  authorName: testimonials.authorName,
  quote: testimonials.quote,
  rating: testimonials.rating,
  barberId: testimonials.barberId,
  barberName: barbers.displayName,
  featured: testimonials.featured,
  sortOrder: testimonials.sortOrder,
};

/** Featured testimonials for the public gallery, best-ordered first. */
export async function loadPublicTestimonials(): Promise<TestimonialRow[]> {
  return db
    .select(baseSelect)
    .from(testimonials)
    .leftJoin(barbers, eq(testimonials.barberId, barbers.id))
    .where(eq(testimonials.featured, true))
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
}

/** Every testimonial for the admin manager. */
export async function loadAllTestimonials(): Promise<TestimonialRow[]> {
  return db
    .select(baseSelect)
    .from(testimonials)
    .leftJoin(barbers, eq(testimonials.barberId, barbers.id))
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.createdAt));
}
