"use client";

import { useState, type ReactNode } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "dark" | "light";

/**
 * Sun/moon theme switch. Flipping the html data-theme attribute is the
 * instant feedback (pure CSS swap); the cookie makes every later SSR render
 * the chosen theme with no flash. No server round-trip needed.
 */
export function ThemeToggle({ initialTheme }: { initialTheme: Theme }): ReactNode {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle(): void {
    document.documentElement.dataset.theme = next;
    document.cookie = `bb_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-secondary"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: 6,
        cursor: "pointer",
        color: "var(--muted)",
      }}
    >
      {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
