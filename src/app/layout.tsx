import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { Footer } from "@/components/ui/Footer";
import { NavLinks, type NavItem } from "@/components/ui/NavLinks";
import { tryGetIdentity } from "@/auth/session";
import { logoutAction } from "@/auth/actions";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const display = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BarberBook",
  description: "Book your next cut - deposits, memberships, standing appointments.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const identity = await tryGetIdentity();

  const items: NavItem[] = [
    { href: "/book", label: "Book now", emphasis: true },
    { href: "/barbers", label: "Barbers" },
    { href: "/memberships", label: "Memberships" },
    ...(identity?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
    ...(identity ? [{ href: "/account", label: "My account" }] : []),
  ];

  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px clamp(16px, 4vw, 32px)",
            borderBottom: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--panel) 85%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Link
            href="/"
            className="display"
            style={{
              fontWeight: 600,
              fontSize: 18,
              textDecoration: "none",
              color: "var(--text)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Barber<span style={{ color: "var(--accent)" }}>Book</span>
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 13,
              flexWrap: "wrap",
            }}
          >
            <NavLinks items={items} />
            {identity ? (
              <form action={logoutAction} style={{ margin: 0 }}>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  Sign out
                </button>
              </form>
            ) : (
              <NavLinks items={[{ href: "/login", label: "Sign in" }]} />
            )}
          </div>
        </nav>
        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
