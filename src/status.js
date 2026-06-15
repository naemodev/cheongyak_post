// src/status.js
// Compute a single display status for a listing. Computed ONCE here (in the
// pipeline) and stored in the snapshot, so the dashboard only displays — it
// never recomputes. Keeps alerts and dashboard in agreement.

import { config } from "../config.js";
import { parseDate, kstToday, daysBetween } from "./dates.js";

// Status keys (also used as sort priority — lower sorts first).
export const STATUS = {
  closing: { key: "closing", label: "마감임박", order: 0 },
  open: { key: "open", label: "접수중", order: 1 },
  upcoming: { key: "upcoming", label: "예정", order: 2 },
  closed: { key: "closed", label: "마감", order: 3 },
  unknown: { key: "unknown", label: "정보없음", order: 4 },
};

export function computeStatus(listing, today = kstToday()) {
  const begin = parseDate(listing.receiptBegin);
  const end = parseDate(listing.receiptEnd);

  if (end && daysBetween(today, end) > 0) return STATUS.closed; // end is in the past
  if (begin && daysBetween(begin, today) > 0) return STATUS.upcoming; // begin in future

  if (begin && daysBetween(today, begin) >= 0) {
    // Receipt is open today. Is the end within the closing-soon window?
    if (end && daysBetween(end, today) <= config.triggers.closingSoonDays) {
      return STATUS.closing;
    }
    return STATUS.open;
  }
  return STATUS.unknown;
}

// Days remaining until receipt end (>=0), or null when unknown/closed.
export function daysLeft(listing, today = kstToday()) {
  const end = parseDate(listing.receiptEnd);
  if (!end) return null;
  const left = daysBetween(end, today);
  return left >= 0 ? left : null;
}
