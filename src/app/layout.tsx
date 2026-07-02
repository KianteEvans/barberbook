import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { tryGetIdentity } from "@/auth/session";
import { logoutAction } from "@/auth/actions";

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

  return (
    <html lang="en">
      <body>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px clamp(16px, 4vw, 32px)",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel)",
          }}
        >
          <Link
            href="/"
            style={{
              fontWeight: 800,
              fontSize: 17,
              textDecoration: "none",
              color: "var(--text)",
              letterSpacing: 0.3,
            }}
          >
            Barber<span style={{ color: "var(--accent)" }}>Book</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
            <Link href="/book" style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600 }}>
              Book now
            </Link>
            {identity?.role === "admin" && (
              <Link href="/admin" style={{ color: "var(--text)", textDecoration: "none" }}>
                Admin
              </Link>
            )}
            {identity ? (
              <>
                <Link href="/account" style={{ color: "var(--text)", textDecoration: "none" }}>
                  My account
                </Link>
                <form action={logoutAction} style={{ margin: 0 }}>
                  <button
                    type="submit"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--muted)",
                    }}
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" style={{ color: "var(--text)", textDecoration: "none" }}>
                Sign in
              </Link>
            )}
          </div>
        </nav>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
