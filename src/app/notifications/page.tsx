import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { loadUserNotifications } from "@/domain/notifications/operations";
import { MarkAllReadButton } from "./MarkAllReadButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage(): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/notifications");

  const rows = await loadUserNotifications(identity.userId);
  const hasUnread = rows.some((r) => r.readAt === null);

  return (
    <PageShell
      title="Notifications"
      subtitle="Reminders and updates about your appointments"
      maxWidth={640}
      action={hasUnread ? <MarkAllReadButton /> : undefined}
    >
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing here yet"
            hint="Appointment reminders and updates will show up here."
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((n) => {
            const unread = n.readAt === null;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  background: unread
                    ? "color-mix(in srgb, var(--accent) 7%, var(--panel))"
                    : "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "14px 16px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: unread ? "var(--accent)" : "transparent",
                    border: unread ? "none" : "1px solid var(--border-strong)",
                  }}
                />
                <div style={{ display: "grid", gap: 3, flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                  <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                    {n.body}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
