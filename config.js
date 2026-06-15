// config.js
// Single source of truth for the whole service.
// All tunable values (regions, endpoints, trigger windows) live here.
// Comments in English; user-facing text (Telegram messages) is built in src/telegram.js.

export const config = {
  // ── Public Data Portal (data.go.kr) service key ───────────────────────────
  // Get it at https://www.data.go.kr/data/15098547/openapi.do → "활용신청".
  // Use the *decoded* key. Injected via env in CI; do NOT hardcode.
  serviceKey: process.env.DATA_GO_KR_KEY ?? "",

  // ── Telegram ──────────────────────────────────────────────────────────────
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
  },

  // ── API endpoints (Korea Real Estate Board "청약홈" via odcloud) ────────────
  // Base + operation. Each entry maps to one housing category the user selected.
  // label is used in the notification so amy knows which kind it is.
  apiBase: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1",
  endpoints: [
    { label: "APT",          op: "getAPTLttotPblancDetail" },     // 민영/공공 APT
    { label: "무순위/잔여",   op: "getRemndrLttotPblancDetail" },  // APT 무순위·잔여세대
    { label: "공공지원임대", op: "getPblimpLttotPblancDetail" },  // 공공지원 민간임대
  ],
  perPage: 500, // odcloud max page size; plenty for a daily window

  // ── Region filtering ───────────────────────────────────────────────────────
  // The API only filters down to 시/도 (경기). 시·군·구 and 위례(걸침) are matched
  // here by keyword against the listing name + address.
  // includeKeywords: a listing matches if ANY keyword appears in name/address.
  region: {
    sidoNames: ["경기"], // SUBSCRPT_AREA_CODE_NM coarse pre-filter
    includeKeywords: [
      "성남",
      "분당",
      "수정구",
      "중원구",
      "용인",
      "수지",
      "기흥",
      "처인",
      "위례", // crosses 성남/하남/송파 — matched purely by name
      "하남",
      "광주", // 경기 광주 (see excludeKeywords to avoid 광주광역시)
    ],
    // Guard against false positives (e.g. 광주광역시, 전남 광주).
    excludeKeywords: ["광주광역시", "광주시 광역", "전라"],
  },

  // ── Trigger windows ──────────────────────────────────────────────────────────
  triggers: {
    // Only consider listings whose announcement date is within this many days.
    // Prevents spamming old listings and bounds the working set.
    lookbackDays: 30,
    // "마감 임박": fire when receipt end date is within this many days from today.
    closingSoonDays: 1,
  },

  // ── State (dedup) ─────────────────────────────────────────────────────────────
  // Each (listing id + trigger type) is recorded once it has been sent.
  stateFile: "state/notified.json",

  // First-run safety: when true, record all current matches as "seen" WITHOUT
  // sending, so the very first run doesn't blast every historical listing.
  // Set SEED_MODE=true for the first run, then remove it.
  seedMode: process.env.SEED_MODE === "true",
};
