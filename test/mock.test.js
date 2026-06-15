// test/mock.test.js
// Offline verification of region filter + trigger logic (no API/Telegram calls).
// Run: node test/mock.test.js

import assert from "node:assert";
import { filterByRegion, matchesRegion } from "../src/filter.js";
import { eventsFor } from "../src/triggers.js";
import { computeStatus, daysLeft } from "../src/status.js";

let pass = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  pass++;
};

// Fixed "today" so the test is deterministic.
const today = new Date(Date.UTC(2026, 5, 15)); // 2026-06-15
const d = (date) => date; // helper alias

// ── Region filter ──────────────────────────────────────────────────────────
ok(matchesRegion({ name: "위례신도시 A1블록", address: "", areaName: "경기" }), "위례 by name");
ok(matchesRegion({ name: "힐스테이트", address: "경기도 성남시 분당구", areaName: "경기" }), "성남 by address");
ok(matchesRegion({ name: "용인 푸르지오", address: "경기도 용인시 기흥구", areaName: "경기" }), "용인");
ok(!matchesRegion({ name: "더샵", address: "광주광역시 북구", areaName: "광주" }), "광주광역시 excluded");
ok(!matchesRegion({ name: "송도 자이", address: "인천 연수구", areaName: "인천" }), "non-region rejected");

const regional = filterByRegion([
  { name: "성남 더샵", address: "경기 성남시", areaName: "경기" },
  { name: "부산 엘시티", address: "부산", areaName: "부산" },
]);
ok(regional.length === 1, "filterByRegion keeps only matches");

// ── Trigger logic ────────────────────────────────────────────────────────────
// Announced today → announce + (begin today) open.
let ev = eventsFor(
  { category: "APT", id: "1", name: "성남 A", announceDate: "2026-06-15", receiptBegin: "2026-06-15", receiptEnd: "2026-06-20" },
  today,
);
ok(ev.some((e) => e.type === "announce"), "fires announce on pub day");
ok(ev.some((e) => e.type === "open"), "fires open on begin day");
ok(!ev.some((e) => e.type === "closing"), "no closing when end is far");

// End is tomorrow → closing fires (closingSoonDays=1).
ev = eventsFor(
  { category: "APT", id: "2", name: "성남 B", announceDate: "2026-06-01", receiptBegin: "2026-06-10", receiptEnd: "2026-06-16" },
  today,
);
ok(ev.some((e) => e.type === "closing"), "fires closing when end is tomorrow");

// Old announcement beyond lookback → no announce.
ev = eventsFor(
  { category: "APT", id: "3", name: "성남 C", announceDate: "2026-01-01", receiptBegin: "", receiptEnd: "" },
  today,
);
ok(!ev.some((e) => e.type === "announce"), "no announce beyond lookback");

// Future announcement → nothing yet.
ev = eventsFor(
  { category: "APT", id: "4", name: "성남 D", announceDate: "2026-07-01", receiptBegin: "2026-07-05", receiptEnd: "2026-07-10" },
  today,
);
ok(ev.length === 0, "no events for future-dated listing");

// YYYYMMDD format parsing also works.
ev = eventsFor(
  { category: "APT", id: "5", name: "성남 E", announceDate: "20260615", receiptBegin: "", receiptEnd: "" },
  today,
);
ok(ev.some((e) => e.type === "announce"), "parses YYYYMMDD dates");

// ── Status computation (dashboard) ───────────────────────────────────────────
const st = (o) => computeStatus(o, today).key;
ok(st({ receiptBegin: "2026-06-10", receiptEnd: "2026-06-20" }) === "open", "open when in window");
ok(st({ receiptBegin: "2026-06-10", receiptEnd: "2026-06-16" }) === "closing", "closing when end<=+1d");
ok(st({ receiptBegin: "2026-06-20", receiptEnd: "2026-06-25" }) === "upcoming", "upcoming when begin future");
ok(st({ receiptBegin: "2026-06-01", receiptEnd: "2026-06-10" }) === "closed", "closed when end past");
ok(st({ receiptBegin: "", receiptEnd: "" }) === "unknown", "unknown when no dates");
ok(daysLeft({ receiptEnd: "2026-06-18" }, today) === 3, "daysLeft computes D-3");
ok(daysLeft({ receiptEnd: "2026-06-01" }, today) === null, "daysLeft null when past");

console.log(`\n✅ all ${pass} assertions passed`);
