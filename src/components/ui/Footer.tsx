import type { ReactNode } from "react";
import { db } from "@/db/client";
import { availabilityRules, shopSettings } from "@/db/schema";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
}

/**
 * Site footer: shop name, aggregated weekly hours (union across barbers -
 * hours live in availability_rules, not shop_settings), and a credit line.
 */
export async function Footer(): Promise<ReactNode> {
  let shopName = "BarberBook";
  let hours: Array<{ day: string; label: string }> = [];
  try {
    const [settings] = await db.select().from(shopSettings);
    if (settings) shopName = settings.shopName;
    const rules = await db.select().from(availabilityRules);
    hours = WEEKDAYS.map((day, weekday) => {
      const todays = rules.filter((r) => r.weekday === weekday);
      if (todays.length === 0) return { day, label: "Closed" };
      const start = Math.min(...todays.map((r) => r.startMin));
      const end = Math.max(...todays.map((r) => r.endMin));
      return { day, label: `${fmt(start)} - ${fmt(end)}` };
    });
  } catch {
    // Footer must never take the page down with it (e.g. DB briefly away).
  }

  return (
    <footer style={{ marginTop: 48 }}>
      <div className="pole-stripe" style={{ borderRadius: 0 }} />
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "32px clamp(16px, 4vw, 32px)",
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <span
            className="display"
            style={{
              fontSize: 20,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {shopName}
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320 }}>
            Walk in sharp, walk out sharper. Book online, lock your slot, and
            keep your cut on schedule.
          </span>
        </div>

        {hours.length > 0 && (
          <div style={{ display: "grid", gap: 4, alignContent: "start" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--muted)",
                marginBottom: 4,
              }}
            >
              Hours
            </span>
            {hours.map((h) => (
              <div
                key={h.day}
                style={{
                  display: "flex",
                  gap: 16,
                  justifyContent: "space-between",
                  fontSize: 12,
                  minWidth: 160,
                }}
              >
                <span style={{ color: "var(--muted)" }}>{h.day}</span>
                <span style={{ color: h.label === "Closed" ? "var(--muted)" : "var(--text)" }}>
                  {h.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p
        style={{
          margin: 0,
          padding: "0 0 24px",
          textAlign: "center",
          fontSize: 11,
          color: "var(--muted)",
          letterSpacing: "0.04em",
        }}
      >
        Powered by BarberBook
      </p>
    </footer>
  );
}
