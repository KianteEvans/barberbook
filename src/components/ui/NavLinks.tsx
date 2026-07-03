"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly emphasis?: boolean;
}

/** Top-nav links with an active-route underline. */
export function NavLinks({ items }: { items: NavItem[] }): ReactNode {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            style={{
              color: active ? "var(--accent)" : "var(--text)",
              textDecoration: "none",
              fontWeight: item.emphasis || active ? 700 : 500,
              fontSize: 13,
              paddingBottom: 3,
              borderBottom: active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
