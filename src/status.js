// src/status.js
// Single display status per listing — computed ONCE here and stored in the
// snapshot so the dashboard only displays. 청약홈 = from dates, LH = from 공고상태.

import { config } from "../config.js";
import { parseDate, kstToday, daysBetween } from "./dates.js";

export const STATUS = {
  closing: { key: "closing", label: "마감임박", order: 0 },
  open: { key: "open", label: "접수중", order: 1 },
  upcoming: { key: "upcoming", label: "예정", order: 2 },
  closed: { key: "closed", label: "마감", order: 3 },
  unknown: { key: "unknown", label: "정보없음", order: 4 },
};

const LH_STATUS_MAP = {
  "접수중": STATUS.open,
  "상담요청": STATUS.open,
  "공고중": STATUS.upcoming,
  "정정공고중": STATUS.upcoming,
  "접수마감": STATUS.closed,
};

function applyhomeStatus(listing, today) {
  const begin = parseDate(listing.receiptBegin);
  const end = parseDate(listing.receiptEnd);
  if (end && daysBetween(today, end) > 0) return STATUS.closed;
  if (begin && daysBetween(begin, today) > 0) return STATUS.upcoming;
  if (begin && daysBetween(today, begin) >= 0) {
    if (end && daysBetween(end, today) <= config.triggers.closingSoonDays) return STATUS.closing;
    return STATUS.open;
  }
  return STATUS.unknown;
}

export function computeStatus(listing, today = kstToday()) {
  if (listing.source === "LH") return LH_STATUS_MAP[listing.panStatus] ?? STATUS.unknown;
  return applyhomeStatus(listing, today);
}

// Days until receipt end (청약홈 only); null for LH or when unknown/closed.
export function daysLeft(listing, today = kstToday()) {
  if (listing.source === "LH") return null;
  const end = parseDate(listing.receiptEnd);
  if (!end) return null;
  const left = daysBetween(end, today);
  return left >= 0 ? left : null;
}
