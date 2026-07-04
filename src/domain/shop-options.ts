/**
 * Curated option lists for admin shop settings. Kept in a plain module (not
 * the "use server" actions file, which may only export async functions) so
 * both the settings page and the validating action can import them.
 */

/** IANA timezones offered in the shop-details form. */
export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export type Timezone = (typeof TIMEZONES)[number];

export const TIMEZONE_LABELS: Record<Timezone, string> = {
  "America/New_York": "Eastern (New York)",
  "America/Chicago": "Central (Chicago)",
  "America/Denver": "Mountain (Denver)",
  "America/Phoenix": "Arizona (no DST)",
  "America/Los_Angeles": "Pacific (Los Angeles)",
  "America/Anchorage": "Alaska (Anchorage)",
  "Pacific/Honolulu": "Hawaii (Honolulu)",
};

/** Minutes between bookable slot starts. */
export const SLOT_GRANULARITIES = [10, 15, 20, 30] as const;
