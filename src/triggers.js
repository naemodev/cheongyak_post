// src/triggers.js
// Decide which notification events a listing should produce.
// Three trigger types: announce (공고 게시), open (접수 시작), closing (마감 임박).
// Dedup (so each event fires once) is handled by the caller via state.

import { config } from "../config.js";
import { parseDate, kstToday, daysBetween } from "./dates.js";

export { kstToday }; // re-export for callers that import it from here

// Returns an array of events: { type, listing }. Caller filters out already-sent ones.
export function eventsFor(listing, today = kstToday()) {
  const events = [];
  const announce = parseDate(listing.announceDate);
  const begin = parseDate(listing.receiptBegin);
  const end = parseDate(listing.receiptEnd);

  // 1) 공고 게시 — announcement date has arrived within the lookback window.
  if (announce) {
    const age = daysBetween(today, announce);
    if (age >= 0 && age <= config.triggers.lookbackDays) {
      events.push({ type: "announce", listing });
    }
  }

  // 2) 접수 시작 — receipt begin date has arrived (and not past the end).
  if (begin) {
    const sinceBegin = daysBetween(today, begin);
    const beforeEnd = !end || today <= end;
    if (sinceBegin >= 0 && sinceBegin <= config.triggers.lookbackDays && beforeEnd) {
      events.push({ type: "open", listing });
    }
  }

  // 3) 마감 임박 — receipt end is today..today+closingSoonDays.
  if (end) {
    const untilEnd = daysBetween(end, today);
    if (untilEnd >= 0 && untilEnd <= config.triggers.closingSoonDays) {
      events.push({ type: "closing", listing });
    }
  }

  return events;
}
