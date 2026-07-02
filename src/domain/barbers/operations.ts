import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barberPhotos, barberServices, barbers, services } from "@/db/schema";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { effectivePricing } from "./pricing";

/** Read-side resolvers for barber profiles and per-barber pricing. */

export interface ResolvedService {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly durationMin: number;
  /** Effective price for THIS barber (override or shop standard). */
  readonly priceCents: number;
  readonly depositCents: number | null;
  readonly isOverride: boolean;
}

/**
 * The service as offered by a specific barber. Throws when the barber does
 * not offer it - this is the booking-time enforcement point.
 */
export async function resolveBarberService(
  barberId: string,
  serviceId: string,
): Promise<ResolvedService> {
  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service || !service.active) throw new NotFoundError("Service not found.");

  const [offering] = await db
    .select()
    .from(barberServices)
    .where(
      and(
        eq(barberServices.barberId, barberId),
        eq(barberServices.serviceId, serviceId),
      ),
    );
  if (!offering) {
    throw new ValidationError("This barber does not offer that service.");
  }

  const priced = effectivePricing(service, offering.priceCents);
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMin: service.durationMin,
    priceCents: priced.priceCents,
    depositCents: priced.depositCents,
    isOverride: offering.priceCents !== null,
  };
}

/** Active barbers who offer the given service, with their effective price. */
export async function loadBarbersForService(serviceId: string) {
  return db
    .select({
      id: barbers.id,
      displayName: barbers.displayName,
      tagline: barbers.tagline,
      photoFile: barbers.photoFile,
      overrideCents: barberServices.priceCents,
    })
    .from(barberServices)
    .innerJoin(barbers, eq(barberServices.barberId, barbers.id))
    .where(and(eq(barberServices.serviceId, serviceId), eq(barbers.active, true)))
    .orderBy(asc(barbers.displayName));
}

export interface BarberProfile {
  readonly id: string;
  readonly displayName: string;
  readonly bio: string | null;
  readonly tagline: string | null;
  readonly photoFile: string | null;
  readonly offerings: ResolvedService[];
  readonly photos: Array<{
    readonly id: string;
    readonly fileName: string;
    readonly caption: string | null;
  }>;
}

/** Full public profile: bio, offerings with effective prices, gallery. */
export async function loadBarberProfile(barberId: string): Promise<BarberProfile> {
  const [barber] = await db
    .select()
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.active, true)));
  if (!barber) throw new NotFoundError("Barber not found.");

  const offerings = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      durationMin: services.durationMin,
      priceCents: services.priceCents,
      depositCents: services.depositCents,
      overrideCents: barberServices.priceCents,
    })
    .from(barberServices)
    .innerJoin(services, eq(barberServices.serviceId, services.id))
    .where(and(eq(barberServices.barberId, barberId), eq(services.active, true)))
    .orderBy(asc(services.name));

  const photos = await db
    .select({
      id: barberPhotos.id,
      fileName: barberPhotos.fileName,
      caption: barberPhotos.caption,
    })
    .from(barberPhotos)
    .where(eq(barberPhotos.barberId, barberId))
    .orderBy(asc(barberPhotos.sortOrder), asc(barberPhotos.createdAt));

  return {
    id: barber.id,
    displayName: barber.displayName,
    bio: barber.bio,
    tagline: barber.tagline,
    photoFile: barber.photoFile,
    offerings: offerings.map((o) => {
      const priced = effectivePricing(o, o.overrideCents);
      return {
        id: o.id,
        name: o.name,
        description: o.description,
        durationMin: o.durationMin,
        priceCents: priced.priceCents,
        depositCents: priced.depositCents,
        isOverride: o.overrideCents !== null,
      };
    }),
    photos,
  };
}
