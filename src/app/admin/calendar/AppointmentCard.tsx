"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { MutationForm } from "@/components/ui/MutationForm";
import { Badge, Stat, type BadgeTone } from "@/components/ui/primitives";
import { cancelBookingAction } from "@/domain/booking/actions";
import {
  chargeRemainderAction,
  markCompletedAction,
  markNoShowAction,
  refundDepositAction,
} from "@/domain/admin/appointment-actions";

export interface AppointmentCardData {
  readonly id: string;
  readonly timeLabel: string;
  readonly clientName: string;
  readonly clientPhone: string | null;
  readonly serviceName: string;
  readonly barberName: string;
  readonly status: string;
  readonly depositLabel: string;
  readonly remainderLabel: string;
  readonly remainderCents: number;
  readonly hasPaymentIntent: boolean;
  readonly tier: string | null;
  readonly graceUntilLabel: string | null;
  readonly confirmState: string | null;
  readonly waitCount: number;
}

const statusTone: Record<string, BadgeTone> = {
  pending_deposit: "warn",
  confirmed: "info",
  reserved: "warn",
  completed: "ok",
  canceled: "neutral",
  no_show: "danger",
};

const tierLabel: Record<string, string> = {
  member: "Member - guaranteed",
  deposit: "Deposit - in the chair",
  unconfirmed: "No deposit - must confirm",
};

export function AppointmentCard({ appt }: { appt: AppointmentCardData }): ReactNode {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const done = () => {
    setOpen(false);
    router.refresh();
  };
  const live = appt.status === "confirmed" || appt.status === "pending_deposit";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="card-hover"
        style={{
          display: "grid",
          gap: 2,
          textAlign: "left",
          width: "100%",
          background: "var(--panel-2)",
          border: "1px solid var(--border)",
          borderLeft: `3px solid var(--${appt.status === "confirmed" ? "info" : appt.status === "completed" ? "ok" : appt.status === "no_show" ? "danger" : "warn"})`,
          borderRadius: 8,
          padding: "8px 10px",
          cursor: "pointer",
          color: "var(--text)",
          opacity: appt.status === "canceled" ? 0.5 : 1,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12 }}>{appt.timeLabel}</span>
        <span style={{ fontSize: 12 }}>{appt.clientName}</span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{appt.serviceName}</span>
        {appt.waitCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
            {appt.waitCount} in line
          </span>
        )}
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Appointment">
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <Stat label="Client" value={appt.clientName} />
            <Stat label="Phone" value={appt.clientPhone ?? "-"} />
            <Stat label="Service" value={appt.serviceName} />
            <Stat label="Barber" value={appt.barberName} />
            <Stat label="Time" value={appt.timeLabel} />
            <Stat
              label="Status"
              value={
                <Badge tone={statusTone[appt.status] ?? "neutral"}>
                  {appt.status.replace("_", " ")}
                </Badge>
              }
            />
            <Stat label="Deposit" value={appt.depositLabel} />
            <Stat label="Remainder" value={appt.remainderLabel} />
            {appt.tier && (
              <Stat label="Lock tier" value={tierLabel[appt.tier] ?? appt.tier} />
            )}
            {appt.graceUntilLabel && (
              <Stat label="Grace until" value={appt.graceUntilLabel} />
            )}
            {appt.confirmState && (
              <Stat label="Attendance" value={appt.confirmState} />
            )}
          </div>

          <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            {live && (
              <MutationForm
                action={markCompletedAction}
                submitLabel="Mark completed"
                hidden={{ appointmentId: appt.id }}
                onSuccess={done}
              />
            )}
            {appt.status === "confirmed" && (
              <MutationForm
                action={markNoShowAction}
                submitLabel="Mark no-show"
                variant="secondary"
                hidden={{ appointmentId: appt.id }}
                onSuccess={done}
              />
            )}
            {(appt.status === "confirmed" || appt.status === "completed") &&
              appt.remainderCents > 0 && (
                <MutationForm
                  action={chargeRemainderAction}
                  submitLabel={`Charge remainder (${appt.remainderLabel})`}
                  hidden={{ appointmentId: appt.id }}
                  onSuccess={done}
                />
              )}
            {appt.hasPaymentIntent && (
              <MutationForm
                action={refundDepositAction}
                submitLabel={`Refund deposit (${appt.depositLabel})`}
                variant="secondary"
                hidden={{ appointmentId: appt.id }}
                onSuccess={done}
              />
            )}
            {live && (
              <MutationForm
                action={cancelBookingAction}
                submitLabel="Cancel appointment"
                variant="danger"
                hidden={{ appointmentId: appt.id }}
                onSuccess={done}
              />
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
