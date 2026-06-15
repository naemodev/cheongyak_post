// src/dates.js
// Shared date helpers. Single source for all day math so alerts and the
// dashboard never disagree on what "today" or "days left" means.

const DAY = 24 * 60 * 60 * 1000;

// Parse "2026-06-10" or "20260610" into a UTC-midnight Date. Returns null if invalid.
export function parseDate(s) {
  if (!s) return null;
  const digits = String(s).replace(/[^0-9]/g, "");
  if (digits.length !== 8) return null;
  const y = +digits.slice(0, 4);
  const m = +digits.slice(4, 6);
  const d = +digits.slice(6, 8);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Today at KST midnight, as a UTC-midnight Date for clean day math.
export function kstToday() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

export const daysBetween = (a, b) => Math.round((a - b) / DAY);

export const isoDay = (date) => date.toISOString().slice(0, 10);
