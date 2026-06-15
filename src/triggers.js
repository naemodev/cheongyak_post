// src/triggers.js
// Decide which notification events a listing produces.
// 청약홈 (date-based): announce / open / closing.
// LH (status-based):  announce / open  (no closing — LH gives no end date).
// Dedup (fire once) is handled by the caller via state.

import { config } from "../config.js";
import { parseDate, kstToday, daysBetween } from "./dates.js";

export { kstToday };

function applyhomeEvents(listing, today) {
  const events = [];
  const announce = parseDate(listing.announceDate);
  const begin = parseDate(listing.receiptBegin);
  const end = parseDate(listing.receiptEnd);

  if (announce) {
    const age = daysBetween(today, announce);
    if (age >= 0 && age <= config.triggers.lookbackDays) events.push({ type: "announce", listing });
  }
  if (begin) {
    const sinceBegin = daysBetween(today, begin);
    const beforeEnd = !end || today <= end;
    if (sinceBegin >= 0 && sinceBegin <= config.triggers.lookbackDays && beforeEnd) events.push({ type: "open", listing });
  }
  if (end) {
    const untilEnd = daysBetween(end, today);
    if (untilEnd >= 0 && untilEnd <= config.triggers.closingSoonDays) events.push({ type: "closing", listing });
  }
  return events;
}

const LH_ACTIVE = new Set(["공고중", "접수중", "정정공고중", "상담요청"]);

function lhEvents(listing) {
  const events = [];
  const s = listing.panStatus;
  if (LH_ACTIVE.has(s)) events.push({ type: "announce", listing }); // notice is up
  if (s === "접수중") events.push({ type: "open", listing });        // accepting now
  return events;
}

export function eventsFor(listing, today = kstToday()) {
  return listing.source === "LH" ? lhEvents(listing) : applyhomeEvents(listing, today);
}
