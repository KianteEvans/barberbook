"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Fixed bottom navigation shown on narrow (<=640px) viewports. */

interface Item {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const S = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const BookIcon = (
  <svg {...S} aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const BarbersIcon = (
  <svg {...S} aria-hidden>
    <circle cx="9" cy="7" r="3" />
    <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M17 11l4 4M21 11l-4 4" />
  </svg>
);
const GalleryIcon = (
  <svg {...S} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const AccountIcon = (
  <svg {...S} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

export function MobileNav({ signedIn }: { signedIn: boolean }): ReactNode {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/book", label: "Book", icon: BookIcon },
    { href: "/barbers", label: "Barbers", icon: BarbersIcon },
    { href: "/gallery", label: "Gallery", icon: GalleryIcon },
    signedIn
      ? { href: "/account", label: "Account", icon: AccountIcon }
      : { href: "/login", label: "Sign in", icon: AccountIcon },
  ];

  return (
    <nav className="mobile-nav" aria-label="Primary">
      {items.map((it) => {
        const active =
          it.href === "/"
            ? pathname === "/"
            : pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link key={it.href} href={it.href} data-active={active}>
            {it.icon}
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
