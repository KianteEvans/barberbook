import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barberServices, services, walkIns } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { loadSettings, loadSlotsForDay, todayInShopTz } from "@/domain/booking/load";
import { resolveBarberForUser } from "@/domain/chair/operations";
import { BookWalkinSlots } from "./BookWalkinSlots";

export const dynamic = "force-dynamic";

/** Barber-only: put a waiting walk-in into a real slot on their calendar. */
export default async function BookWalkinPage({
  params,
  searchParams,
}: {
  params: Promise<{ walkinId: string }>;
  searchParams: Promise<{ date?: string; service?: string }>;
}): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/chair");
  if (identity.role !== "barber") redirect("/");
  const barber = await resolveBarberForUser(identity.userId);
  if (!barber) redirect("/chair");

  const { walkinId } = await params;
  const query = await searchParams;

  const [walkin] = await db
    .select({
      id: walkIns.id,
      name: walkIns.name,
      status: walkIns.status,
      barberId: walkIns.barberId,
      serviceId: walkIns.serviceId,
    })
    .from(walkIns)
    .where(eq(walkIns.id, walkinId));
  if (!walkin) notFound();
  if (walkin.status !== "waiting") redirect("/chair");
  if (walkin.barberId !== null && walkin.barberId !== barber.id) redirect("/chair");

  // Services this barber offers (walk-in's wish preselected when offered).
  const offered = await db
    .select({ id: services.id, name: services.name, durationMin: services.durationMin })
    .from(barberServices)
    .innerJoin(services, eq(barberServices.serviceId, services.id))
    .where(and(eq(barberServices.barberId, barber.id), eq(services.active, true)))
    .orderBy(asc(services.name));
  if (offered.length === 0) {
    return (
      <PageShell title="Book a slot" maxWidth={720}>
        <EmptyState
          title="Your chair has no services configured"
          hint="Ask the shop owner to add services to your chair."
        />
      </PageShell>
    );
  }

  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  const date = query.date ?? today;
  const requested = offered.find((s) => s.id === (query.service ?? walkin.serviceId));
  const service = requested ?? offered[0]!;

  const slots = await loadSlotsForDay({
    barberId: barber.id,
    serviceId: service.id,
    date,
  });

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(format(addDays(new Date(`${today}T12:00:00Z`), i), "yyyy-MM-dd"));
  }
  const hrefFor = (d: string, svc: string): string =>
    `/chair/book/${walkin.id}?date=${d}&service=${svc}`;

  const chip = (active: boolean) =>
    ({
      padding: "7px 14px",
      borderRadius: "var(--radius-full)",
      fontSize: 13,
      fontWeight: 600,
      textDecoration: "none",
      color: active ? "var(--accent-ink)" : "var(--text)",
      background: active ? "var(--accent)" : "var(--panel)",
      border: "1px solid var(--border)",
      whiteSpace: "nowrap",
    }) as const;

  return (
    <PageShell
      title={`Book a slot for ${walkin.name}`}
      subtitle={`${barber.displayName}'s calendar - no deposit, they pay at the shop`}
      maxWidth={720}
      action={
        <Link href="/chair" style={chip(false)}>
          {"< Back to my chair"}
        </Link>
      }
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {offered.map((s) => (
          <Link key={s.id} href={hrefFor(date, s.id)} className={s.id === service.id ? undefined : "chip"} style={chip(s.id === service.id)}>
            {s.name} ({s.durationMin} min)
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d) => {
          const active = d === date;
          const dayDate = new Date(`${d}T12:00:00Z`);
          return (
            <Link key={d} href={hrefFor(d, service.id)} className={active ? undefined : "chip"} style={chip(active)}>
              {format(dayDate, "EEE d")}
            </Link>
          );
        })}
      </div>

      <Card title={`Open times - ${format(new Date(`${date}T12:00:00Z`), "EEEE, MMM d")}`}>
        <BookWalkinSlots
          walkinId={walkin.id}
          serviceId={service.id}
          walkinName={walkin.name}
          slots={slots.map((s) => ({
            startIso: s.startUtc.toISOString(),
            label: format(toZonedTime(s.startUtc, settings.timezone), "h:mm a"),
          }))}
        />
      </Card>
    </PageShell>
  );
}
