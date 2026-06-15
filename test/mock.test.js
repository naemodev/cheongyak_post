// test/mock.test.js
// Offline verification: region filter + triggers + status for both sources.
// Run: node test/mock.test.js

import assert from "node:assert";
import { filterByRegion, matchesRegion } from "../src/filter.js";
import { eventsFor } from "../src/triggers.js";
import { computeStatus, daysLeft } from "../src/status.js";
import { matchEligibility, tagsFor, tagList } from "../src/eligibility.js";

let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };
const today = new Date(Date.UTC(2026, 5, 15)); // 2026-06-15

// ── Region filter ──────────────────────────────────────────────────────────
ok(matchesRegion({ name: "위례신도시 A1블록", address: "", areaName: "경기" }), "위례 by name");
ok(matchesRegion({ name: "힐스테이트", address: "경기도 성남시 분당구", areaName: "경기" }), "성남 by address");
ok(!matchesRegion({ name: "더샵", address: "광주광역시 북구", areaName: "광주" }), "광주광역시 excluded");
ok(!matchesRegion({ name: "송도 자이", address: "인천", areaName: "인천" }), "non-region rejected");
ok(filterByRegion([{ name: "성남 더샵", address: "경기 성남시", areaName: "경기" }, { name: "부산", address: "부산", areaName: "부산" }]).length === 1, "filterByRegion");

// ── 청약홈 (date-based) ──────────────────────────────────────────────────────
const ah = (o) => eventsFor({ source: "청약홈", category: "APT", id: "1", ...o }, today);
let ev = ah({ announceDate: "2026-06-15", receiptBegin: "2026-06-15", receiptEnd: "2026-06-20" });
ok(ev.some((e) => e.type === "announce") && ev.some((e) => e.type === "open"), "청약홈 announce+open");
ev = ah({ announceDate: "2026-06-01", receiptBegin: "2026-06-10", receiptEnd: "2026-06-16" });
ok(ev.some((e) => e.type === "closing"), "청약홈 closing on D-1");
ok(ah({ announceDate: "2026-01-01" }).every((e) => e.type !== "announce"), "청약홈 no announce beyond lookback");
ok(computeStatus({ source: "청약홈", receiptBegin: "2026-06-10", receiptEnd: "2026-06-20" }, today).key === "open", "청약홈 status open");
ok(daysLeft({ source: "청약홈", receiptEnd: "2026-06-18" }, today) === 3, "청약홈 daysLeft D-3");

// ── LH (status-based) ────────────────────────────────────────────────────────
const lh = (panStatus) => eventsFor({ source: "LH", category: "LH 임대", id: "06:1", panStatus }, today);
ok(lh("공고중").some((e) => e.type === "announce") && lh("공고중").every((e) => e.type !== "open"), "LH 공고중 → announce only");
ok(lh("접수중").some((e) => e.type === "announce") && lh("접수중").some((e) => e.type === "open"), "LH 접수중 → announce+open");
ok(lh("접수마감").length === 0, "LH 접수마감 → no events");
ok(computeStatus({ source: "LH", panStatus: "접수중" }).key === "open", "LH status open");
ok(computeStatus({ source: "LH", panStatus: "공고중" }).key === "upcoming", "LH status upcoming");
ok(computeStatus({ source: "LH", panStatus: "접수마감" }).key === "closed", "LH status closed");
ok(daysLeft({ source: "LH", panStatus: "접수중" }) === null, "LH daysLeft null");

// ── Eligibility matching ─────────────────────────────────────────────────────
ok(matchEligibility({ source: "LH", category: "신혼희망타운", detailType: "신혼희망타운", name: "성남복정1 신혼희망타운" }).single === "불가", "신혼희망타운 → 1인 불가");
ok(matchEligibility({ source: "LH", category: "LH 임대", detailType: "행복주택", name: "금토 행복주택" }).single === "가능", "행복주택 → 1인 가능");
ok(matchEligibility({ source: "LH", category: "LH 임대", detailType: "국민임대", name: "x" }).key === "국민임대", "국민임대 매칭");
ok(matchEligibility({ source: "청약홈", category: "무순위/잔여", detailType: "", name: "x" }).key === "무순위/잔여", "무순위 매칭");
ok(matchEligibility({ source: "청약홈", category: "공공지원임대", detailType: "", name: "x" }).key === "공공지원민간임대", "공공지원임대 매칭");
ok(matchEligibility({ source: "청약홈", category: "APT", group: "분양", detailType: "민영", name: "래미안" }).key === "민영분양", "민영분양 fallback");
ok(matchEligibility({ source: "청약홈", category: "APT", group: "분양", detailType: "국민", name: "공공분양 단지" }).key === "공공분양", "공공분양(국민주택) 매칭");

// ── Tags (group + personas) ──────────────────────────────────────────────────
let tg = tagsFor({ source: "LH", category: "신혼희망타운", group: "분양", detailType: "신혼희망타운", name: "성남복정1 신혼희망타운" });
ok(tg.group === "분양" && tg.personas.includes("예비신혼부부") && !tg.personas.includes("1인가구"), "신혼희망타운 → 예비신혼부부, 1인가구 제외");
tg = tagsFor({ source: "LH", category: "LH 임대", group: "임대", detailType: "행복주택", name: "x" });
ok(tg.personas.includes("1인가구") && tg.personas.includes("예비신혼부부"), "행복주택 → 1인가구+예비신혼부부");
tg = tagsFor({ source: "청약홈", category: "무순위/잔여", group: "무순위", detailType: "", name: "x" });
ok(tg.group === "무순위" && tg.personas.includes("1인가구"), "무순위 → 1인가구");

// ── tagList (merged hashtags) ─────────────────────────────────────────────────
let tl = tagList({ source: "청약홈", category: "APT", group: "분양", detailType: "신혼희망타운", name: "x" });
ok(tl.join(" ") === "청약홈 신혼희망타운 분양 예비신혼부부 신혼부부", "청약홈 신혼희망타운 태그열");
tl = tagList({ source: "청약홈", category: "무순위/잔여", group: "무순위", detailType: "", name: "x" });
ok(tl[0] === "청약홈" && tl[1] === "무순위" && !tl.includes("무순위/잔여"), "무순위 토큰 정리 + 중복 제거");
tl = tagList({ source: "LH", category: "LH 분양", group: "분양", detailType: "공공분양(신혼희망)", name: "x" });
ok(tl.includes("공공분양") && !tl.some((t) => t.includes("(")), "괄호 제거된 타입 토큰");

console.log(`\n✅ all ${pass} assertions passed`);
