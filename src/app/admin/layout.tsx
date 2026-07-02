import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { tryGetIdentity } from "@/auth/session";

const TABS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/barbers", label: "Barbers" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/hours", label: "Hours" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/memberships", label: "Memberships" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  if (!identity) redirect("/login?next=/admin");
  if (identity.role !== "admin") redirect("/");

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "10px clamp(16px, 4vw, 32px)",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel)",
          overflowX: "auto",
        }}
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              color: "var(--text)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 8,
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
