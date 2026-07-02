"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Polls the appointment status until it leaves pending_deposit. The Stripe
 * webhook - not the redirect - is what confirms the booking, so the success
 * page waits for the DB to agree.
 */
export function StatusPoller({
  appointmentId,
  initialStatus,
}: {
  appointmentId: string;
  initialStatus: string;
}): ReactNode {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status !== "pending_deposit") return;
    const timer = window.setInterval(() => {
      void fetch(`/api/appointments/${appointmentId}/status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { status?: string } | null) => {
          if (data?.status && data.status !== "pending_deposit") {
            setStatus(data.status);
          }
        })
        .catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [appointmentId, status]);

  if (status === "confirmed" || status === "completed") {
    return (
      <div role="status" style={{ display: "grid", gap: 6, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 40 }}>{"✅"}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>You are booked!</p>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          A spot has been locked in for you. See you soon.
        </p>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div role="status" style={{ display: "grid", gap: 6, textAlign: "center" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Booking canceled</p>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          The payment was not completed in time and the slot was released.
          You can book again any time.
        </p>
      </div>
    );
  }

  return (
    <div role="status" style={{ display: "grid", gap: 6, textAlign: "center" }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>
        Waiting for payment confirmation...
      </p>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        This updates automatically once your deposit is confirmed. If you closed
        the payment page, the slot is held for 30 minutes.
      </p>
    </div>
  );
}
