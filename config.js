// config.js
// Single source of truth for the whole service.
// All tunable values (sources, regions, trigger windows) live here.
// Comments in English; user-facing text (Telegram/dashboard) is built elsewhere.

export const config = {
  // ── Public Data Portal (data.go.kr) service key ───────────────────────────
  // One key works for BOTH datasets below — but you must click "활용신청" on each:
  //   1) 한국부동산원_청약홈 분양정보 (15098547)
  //   2) 한국토지주택공사_분양임대공고문 (15058530)
  // Use the *decoded* key. Injected via env in CI; do NOT hardcode.
  serviceKey: process.env.DATA_GO_KR_KEY ?? "",

  // ── Telegram ──────────────────────────────────────────────────────────────
  // chatId can be a personal chat, a group, or a channel (prefix -100… for channels).
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
  },

  // ── Source 1: 청약홈 (한국부동산원, odcloud) — date-based ───────────────────
  applyhome: {
    base: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1",
    perPage: 500,
    endpoints: [
      { label: "APT",          op: "getAPTLttotPblancDetail",    group: "분양" },
      { label: "무순위/잔여",   op: "getRemndrLttotPblancDetail", group: "무순위" },
      { label: "공공지원임대", op: "getPblimpLttotPblancDetail",  group: "임대" },
    ],
  },

  // ── Source 2: LH (한국토지주택공사) — status-based ──────────────────────────
  // Response gives 공고상태(공고중/접수중/접수마감) but no per-item dates, so LH
  // listings trigger on status (게시/접수시작) — no "마감 임박" for LH.
  lh: {
    enabled: true,
    base: "http://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1",
    regionCode: "41", // 경기 (시도 코드). Server-side narrows before keyword filter.
    pageSize: 100,
    // UPP_AIS_TP_CD: 01 토지 / 05 분양주택 / 06 임대주택 / 13 주거복지 / 22 상가 / 39 신혼희망타운
    types: [
      { code: "05", label: "LH 분양",     group: "분양" },
      { code: "06", label: "LH 임대",     group: "임대" },
      { code: "39", label: "신혼희망타운", group: "분양" },
    ],
  },

  // ── Region filtering (applied to both sources) ─────────────────────────────
  region: {
    includeKeywords: [
      "성남", "분당", "수정구", "중원구",
      "용인", "수지", "기흥", "처인",
      "위례", // crosses 성남/하남/송파 — matched purely by name
      "하남",
      "광주", // 경기 광주 (excludeKeywords guards against 광주광역시)
    ],
    excludeKeywords: ["광주광역시", "광주시 광역", "전라"],
  },

  // ── Trigger windows ──────────────────────────────────────────────────────────
  triggers: {
    lookbackDays: 30,    // only listings announced within N days (청약홈)
    closingSoonDays: 1,  // "마감 임박" fires N days before receipt end (청약홈 only)
    lhLookbackDays: 90,  // LH 게시일 search window
  },

  stateFile: "state/notified.json",
  seedMode: process.env.SEED_MODE === "true",
};
