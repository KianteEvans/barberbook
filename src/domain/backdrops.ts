/**
 * Built-in landing-page backdrop styles. Each maps to a `backdrop-<name>`
 * class in globals.css; the shop's choice lives in shop_settings.backdrop and
 * `/?backdrop=<name>` previews any of them without saving.
 */
export const BACKDROPS = [
  "skyline",
  "brick",
  "neon",
  "grid",
  "halftone",
] as const;

export type Backdrop = (typeof BACKDROPS)[number];

export const BACKDROP_LABELS: Record<Backdrop, string> = {
  skyline: "Downtown - skyline silhouette",
  brick: "Back alley - painted brick",
  neon: "Night shift - neon glow",
  grid: "City blocks - street grid",
  halftone: "Print shop - halftone poster",
};

export function isBackdrop(value: string | undefined | null): value is Backdrop {
  return BACKDROPS.includes(value as Backdrop);
}
