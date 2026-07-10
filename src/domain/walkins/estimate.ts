/**
 * Pure walk-in wait estimate: people ahead of you spread across the active
 * chairs, each taking roughly one average service. Deliberately coarse - a
 * shop-floor signal, not a promise.
 */
export function estimateWaitMin(
  peopleAhead: number,
  avgServiceMin: number,
  activeChairs: number,
): number {
  if (peopleAhead <= 0) return 0;
  const chairs = Math.max(1, activeChairs);
  return Math.ceil(peopleAhead / chairs) * avgServiceMin;
}
