import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { loadWalkinQueue } from "@/domain/walkins/operations";
import { loadSettings } from "@/domain/booking/load";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

/**
 * Public shop-floor board (meant for a tablet by the door): first names only,
 * no contact details, auto-refreshing. Deliberately unlinked from the nav.
 */
export default async function QueueBoardPage(): Promise<ReactNode> {
  const queue = await loadWalkinQueue();
  const settings = await loadSettings();
  const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

  return (
    <PageShell
      title="The line"
      subtitle={`${settings.shopName} - walk-ins are welcome`}
      maxWidth={640}
      stripe
    >
      <AutoRefresh seconds={30} />
      <Card>
        {queue.length === 0 ? (
          <EmptyState
            title="No wait right now"
            hint="Walk in and take a seat - you're next."
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {queue.map((w, i) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "14px 18px",
                  background: w.status === "serving" ? "var(--panel-2)" : "var(--panel)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    className="display"
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--accent)",
                      minWidth: 28,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>
                    {firstName(w.name)}
                  </span>
                </div>
                <Badge tone={w.status === "serving" ? "ok" : "warn"}>
                  {w.status === "serving"
                    ? `in the chair${w.barberName ? ` with ${w.barberName}` : ""}`
                    : w.estWaitMin === 0
                      ? "up next"
                      : `~${w.estWaitMin} min`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
        Estimates are rough - grab a seat and we&apos;ll call your name.
      </p>
    </PageShell>
  );
}
