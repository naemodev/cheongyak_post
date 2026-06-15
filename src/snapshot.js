// src/snapshot.js
// Persist current in-region listings (with computed status + general eligibility)
// for the dashboard. Same fetch+filter result that drives alerts — single source.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { computeStatus, daysLeft } from "./status.js";
import { matchEligibility, BASE_YEAR, PERSONAS } from "./eligibility.js";
import { kstToday } from "./dates.js";

const SNAPSHOT_FILE = "docs/data/listings.json";

export async function writeSnapshot(listings) {
  const today = kstToday();
  const items = listings.map((l) => {
    const status = computeStatus(l, today);
    const elig = matchEligibility(l);
    const personas = (elig?.personas ?? []).filter((p) => PERSONAS.includes(p));
    return {
      source: l.source,
      category: l.category,
      group: l.group,
      detailType: l.detailType ?? "",
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
      personas,
      eligibility: elig
        ? { type: elig.key, single: elig.single, income: elig.income, asset: elig.asset, note: elig.note }
        : null,
    };
  });
  items.sort((a, b) =>
    a.statusOrder !== b.statusOrder ? a.statusOrder - b.statusOrder : (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
  );
  const payload = { updatedAt: new Date().toISOString(), eligibilityBaseYear: BASE_YEAR, personas: PERSONAS, count: items.length, items };
  await mkdir(dirname(SNAPSHOT_FILE), { recursive: true });
  await writeFile(SNAPSHOT_FILE, JSON.stringify(payload, null, 2));
}
