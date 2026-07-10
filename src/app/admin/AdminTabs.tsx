"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/walkins", label: "Walk-ins" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/barbers", label: "Barbers" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/hours", label: "Hours" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/memberships", label: "Memberships" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/settings", label: "Settings" },
];

/** Admin tab strip with an active-route indicator. */
export function AdminTabs(): ReactNode {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 clamp(16px, 4vw, 32px)",
        borderBottom: "1px solid var(--border)",
        background: "var(--panel)",
        overflowX: "auto",
      }}
    >
      {TABS.map((t) => {
        const active =
          t.href === "/admin"
            ? pathname === "/admin"
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="nav-link"
            style={{
              color: active ? "var(--accent)" : "var(--text)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 12px",
              whiteSpace: "nowrap",
              borderBottom: active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
