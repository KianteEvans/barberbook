import Link from "next/link";
import type { ReactNode } from "react";

/** Nav bell linking to /notifications, with an unread badge. Server-rendered. */
export function NotificationBell({ count }: { count: number }): ReactNode {
  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      title="Notifications"
      className="nav-link"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text)",
        textDecoration: "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.5 2 6.3.4.4.1 1.2-.5 1.2H4.5c-.6 0-.9-.8-.5-1.2C4.8 14.5 6 13 6 9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M10 20a2 2 0 0 0 4 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -8,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: 10,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
