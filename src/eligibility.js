// src/eligibility.js
// Reference "general eligibility" by housing type — a quick guide, NOT per-listing truth.
// Single source: edit this one table. Figures are PROGRAM-LEVEL rules (% of 도시근로자
// 월평균소득 등); won amounts behind them change yearly, so each card shows BASE_YEAR +
// a "공고문 확인 필수" disclaimer.
//
// single:   "가능" | "조건부" | "불가"  — typical 1-person household applicability.
// personas: which applicant groups a type commonly serves (참고용 — 공고별 상이).

export const BASE_YEAR = 2025;

// Master persona list (used to render filter chips). Trim here to hide a tag everywhere.
export const PERSONAS = [
  "1인가구", "예비신혼부부", "신혼부부", "청년",
  "생애최초", "다자녀", "노부모부양", "고령자", "수급자", "무주택",
];

const TABLE = [
  {
    key: "신혼희망타운", match: ["신혼희망"],
    single: "불가",
    income: "도시근로자 월평균소득 130% 이하(맞벌이 140%)",
    asset: "총자산 약 3.54억 이하(2025)",
    note: "혼인 7년 이내·예비부부·6세 이하 자녀 한부모 — 1인 단독 신청 불가",
    personas: ["예비신혼부부", "신혼부부"],
  },
  {
    key: "행복주택", match: ["행복주택"],
    single: "가능",
    income: "도시근로자 월평균소득 100% 이하(1인 120%, 맞벌이신혼 120%)",
    asset: "세대 총자산·자동차 기준 충족",
    note: "청년·신혼·고령 등 계층별 요건. 청년(1인) 신청 가능",
    personas: ["1인가구", "청년", "예비신혼부부", "신혼부부", "고령자", "무주택"],
  },
  {
    key: "국민임대", match: ["국민임대"],
    single: "가능",
    income: "도시근로자 월평균소득 70% 이하(1인 90%, 2인 80%)",
    asset: "총자산·자동차 기준 충족",
    note: "무주택세대구성원",
    personas: ["1인가구", "신혼부부", "고령자", "무주택"],
  },
  {
    key: "통합공공임대", match: ["통합공공"],
    single: "가능",
    income: "기준 중위소득 100% 이하(우선)/150%(일반)",
    asset: "총자산 3.45억·자동차 4,542만원 이하(2025)",
    note: "무주택세대구성원, 1인가구 우대 구간 있음",
    personas: ["1인가구", "청년", "예비신혼부부", "신혼부부", "고령자", "수급자", "무주택"],
  },
  {
    key: "영구임대", match: ["영구임대"],
    single: "조건부",
    income: "생계·의료급여 수급자 등 (계층별)",
    asset: "자산 기준 별도",
    note: "기초수급자·차상위 등 사회취약계층 대상 — 자격 제한적",
    personas: ["수급자", "고령자"],
  },
  {
    key: "장기전세", match: ["장기전세"],
    single: "가능",
    income: "도시근로자 월평균소득 기준(면적·유형별)",
    asset: "총자산·자동차 기준 충족",
    note: "무주택세대구성원",
    personas: ["1인가구", "신혼부부", "무주택"],
  },
  {
    key: "공공지원민간임대", match: ["공공지원"],
    single: "가능",
    income: "유형별 상이 — 일반·청년형은 소득 무관/완화",
    asset: "유형별 상이",
    note: "청년·신혼·일반 유형마다 요건 다름. 일부는 소득 요건 없음",
    personas: ["1인가구", "청년", "예비신혼부부", "신혼부부"],
  },
  {
    key: "무순위/잔여", match: ["무순위", "잔여"],
    single: "가능",
    income: "보통 소득·자산 요건 없음",
    asset: "보통 요건 없음",
    note: "해당 주택건설지역 무주택 세대구성원 등 — 요건 대폭 완화(공고별 확인)",
    personas: ["1인가구", "무주택"],
  },
  {
    key: "공공분양", match: ["공공분양", "나눔형", "선택형"],
    single: "조건부",
    income: "무주택 + 소득·자산 요건(공급유형별)",
    asset: "총자산·자동차 기준 충족",
    note: "일반·생애최초 일부 1인 가능, 신혼·다자녀 특공은 부부/자녀 요건",
    personas: ["생애최초", "예비신혼부부", "신혼부부", "다자녀", "노부모부양", "1인가구", "무주택"],
  },
  {
    key: "민영분양", match: [],
    single: "가능",
    income: "일반공급은 보통 소득·자산 요건 없음(추첨·가점)",
    asset: "일반공급 요건 없음",
    note: "청약통장+무주택/세대주 등. 특별공급은 유형별 소득요건 별도",
    personas: ["1인가구", "예비신혼부부", "신혼부부", "생애최초", "다자녀", "노부모부양"],
  },
];

const byKey = (k) => TABLE.find((e) => e.key === k) ?? null;

export function matchEligibility(item) {
  const hay = `${item.detailType ?? ""} ${item.category ?? ""} ${item.name ?? ""}`;
  for (const e of TABLE) {
    if (e.match.length && e.match.some((k) => hay.includes(k))) return e;
  }
  if (item.category === "무순위/잔여") return byKey("무순위/잔여");
  if (item.category === "공공지원임대") return byKey("공공지원민간임대");
  if (item.source === "청약홈" && item.category === "APT") {
    const dt = item.detailType ?? "";
    if (dt.includes("국민") || dt.includes("공공")) return byKey("공공분양");
    return byKey("민영분양");
  }
  if (item.group === "분양") return byKey("민영분양");
  return null;
}

// Tags for a listing: group + personas (filtered to the master PERSONAS list).
export function tagsFor(item) {
  const e = matchEligibility(item);
  const personas = (e?.personas ?? []).filter((p) => PERSONAS.includes(p));
  return { group: item.group, personas };
}

// Clean a raw type string into a hashtag-friendly token:
// "공공분양(신혼희망)" → "공공분양", "무순위/잔여" → "무순위", "신혼희망타운" → 그대로.
function cleanToken(s) {
  return String(s || "")
    .replace(/[\(\[][^\)\]]*[\)\]]/g, "") // drop (...) [...]
    .split(/[\/·,]/)[0]                         // first segment
    .replace(/\s+/g, "")
    .trim();
}

// Final ordered tag list for a listing: source + type + group + personas (deduped).
export function tagList(item) {
  const e = matchEligibility(item);
  const personas = (e?.personas ?? []).filter((p) => PERSONAS.includes(p));
  const raw = [item.source, cleanToken(item.detailType || item.category), item.group, ...personas];
  const seen = new Set();
  const out = [];
  for (const t of raw) { if (t && !seen.has(t)) { seen.add(t); out.push(t); } }
  return out;
}
