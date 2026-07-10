/**
 * Pure iCalendar (.ics) generation for an appointment. All timestamps are
 * emitted as UTC (Z) so any calendar app renders them in the viewer's zone.
 */

export interface IcsEvent {
  readonly uid: string;
  readonly start: Date;
  readonly end: Date;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly now?: Date;
}

/** UTC basic format: 20260709T150000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape per RFC 5545 text rules. */
function esc(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function toIcs(ev: IcsEvent): string {
  const stamp = icsDate(ev.now ?? ev.start);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarberBook//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@barberbook`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDate(ev.start)}`,
    `DTEND:${icsDate(ev.end)}`,
    `SUMMARY:${esc(ev.summary)}`,
    ...(ev.description ? [`DESCRIPTION:${esc(ev.description)}`] : []),
    ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}
