import type { ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { loadClientList } from "@/domain/clients/operations";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage(): Promise<ReactNode> {
  const clients = await loadClientList();

  return (
    <PageShell title="Clients" subtitle="Everyone who has booked, with visit history and notes">
      <Card>
        {clients.length === 0 ? (
          <EmptyState title="No clients yet" hint="Clients appear here after they sign up." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Completed</th>
                <th>No-shows</th>
                <th>Last visit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {c.email}
                    {c.phone && <span> - {c.phone}</span>}
                  </td>
                  <td>{c.completedCount}</td>
                  <td>
                    {c.noShowCount > 0 ? (
                      <Badge tone="danger">{c.noShowCount}</Badge>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>0</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {c.lastVisitAt ? format(c.lastVisitAt, "MMM d, yyyy") : "-"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/admin/clients/${c.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--accent)",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
