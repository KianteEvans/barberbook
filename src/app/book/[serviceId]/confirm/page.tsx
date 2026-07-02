import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { resolveBarberService } from "@/domain/barbers/operations";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Stat } from "@/components/ui/primitives";
import { Field, Select } from "@/components/ui/fields";
import { MutationForm } from "@/components/ui/MutationForm";
import { createBookingAction } from "@/domain/booking/actions";
import { loadSettings } from "@/domain/booking/load";
import { computeDeposit } from "@/domain/payments/deposit";
import { formatMoney } from "@/domain/money";
import { loadClientMembership } from "@/domain/memberships/operations";
import { paymentsEnabled } from "@/env";

export const dynamic = "force-dynamic";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ barber?: string; start?: string }>;
}): Promise<ReactNode> {
  const { serviceId } = await params;
  const query = await searchParams;
  if (!query.barber || !query.start) notFound();

  const identity = await tryGetIdentity();
  if (!identity) {
    const next = `/book/${serviceId}/confirm?barber=${query.barber}&start=${encodeURIComponent(query.start)}`;
    redirect(`/login?mode=signup&next=${encodeURIComponent(next)}`);
  }

  const [barber] = await db.select().from(barbers).where(eq(barbers.id, query.barber));
  if (!barber) notFound();
  let service;
  try {
    // Barber-effective pricing; throws when the barber doesn't offer it.
    service = await resolveBarberService(barber.id, serviceId);
  } catch {
    notFound();
  }

  const settings = await loadSettings();
  const startAt = new Date(query.start);
  const local = toZonedTime(startAt, settings.timezone);
  const { depositCents, remainderCents } = computeDeposit(service, settings);
  const collectDeposit = paymentsEnabled && depositCents > 0;
  const membership = await loadClientMembership(identity.userId);
  const canUseCredit = (membership?.creditsAvailable ?? 0) > 0;

  return (
    <PageShell title="Confirm your booking" subtitle="Step 3 of 3" maxWidth={560}>
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <Stat label="Service" value={service.name} />
          <Stat label="Barber" value={barber.displayName} />
          <Stat label="When" value={format(local, "EEE, MMM d - h:mm a")} />
          <Stat label="Price" value={formatMoney(service.priceCents)} />
          {collectDeposit && (
            <>
              <Stat label="Deposit due now" value={formatMoney(depositCents)} />
              <Stat label="Due at the shop" value={formatMoney(remainderCents)} />
            </>
          )}
        </div>

        {collectDeposit ? (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px" }}>
            You will be taken to our secure payment page to pay the deposit and
            lock in this slot. Cancel at least {settings.cancellationWindowHours}{" "}
            hours ahead for a full deposit refund.
          </p>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 14px" }}>
            Pay at the shop. Cancel at least {settings.cancellationWindowHours}{" "}
            hours ahead if you cannot make it.
          </p>
        )}

        <MutationForm
          action={createBookingAction}
          submitLabel={collectDeposit ? `Pay ${formatMoney(depositCents)} deposit` : "Book it"}
          successMessage="Booked!"
          hidden={{
            barberId: barber.id,
            serviceId: service.id,
            startAt: startAt.toISOString(),
          }}
        >
          {canUseCredit && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                background: "color-mix(in srgb, var(--ok) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ok) 35%, transparent)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <input type="checkbox" name="useCredit" defaultChecked />
              Use 1 {membership?.planName} credit ({membership?.creditsAvailable}{" "}
              left) - no deposit, nothing due at the shop
            </label>
          )}
          <Field label="Repeat this appointment?">
            <Select name="cadenceWeeks" defaultValue="0">
              <option value="0">No, just this once</option>
              <option value="1">Every week</option>
              <option value="2">Every 2 weeks</option>
              <option value="3">Every 3 weeks</option>
              <option value="4">Every 4 weeks</option>
            </Select>
          </Field>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            Repeating bookings reserve the same day and time going forward
            {collectDeposit
              ? "; your card is saved and each visit's deposit is charged automatically."
              : "."}
          </p>
          {collectDeposit && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <input type="checkbox" name="saveCard" />
              Save my card for faster checkout
            </label>
          )}
        </MutationForm>
      </Card>
    </PageShell>
  );
}
