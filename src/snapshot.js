// src/snapshot.js
// Persist the current in-region listings (with computed status) for the
// dashboard. Same fetch+filter result that drives alerts feeds this file —
// single source of truth.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { computeStatus, daysLeft } from "./status.js";
import { kstToday } from "./dates.js";

const SNAPSHOT_FILE = "docs/data/listings.json";

export async function writeSnapshot(listings) {
  const today = kstToday();
  const items = listings.map((l) => {
    const status = computeStatus(l, today);
    return {
      category: l.category,
      name: l.name,
      address: l.address,
      areaName: l.areaName,
      announceDate: l.announceDate,
      receiptBegin: l.receiptBegin,
      receiptEnd: l.receiptEnd,
      totalHouseholds: l.totalHouseholds,
      url: l.url,
      status: status.key,
      statusLabel: status.label,
      statusOrder: status.order,
      daysLeft: daysLeft(l, today),
    };
  });

  // Sort: status priority, then soonest deadline.
  items.sort((a, b) => {
    if (a.statusOrder !== b.statusOrder) return a.statusOrder - b.statusOrder;
    return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
  });

  const payload = { updatedAt: new Date().toISOString(), count: items.length, items };
  await mkdir(dirname(SNAPSHOT_FILE), { recursive: true });
  await writeFile(SNAPSHOT_FILE, JSON.stringify(payload, null, 2));
}
