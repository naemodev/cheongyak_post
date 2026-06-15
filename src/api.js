// src/api.js
// Fetch listings from the 청약홈 분양정보 API (odcloud REST).
// Field names differ slightly across categories, so everything is normalized
// into one shape here — the rest of the app never touches raw API fields.

import { config } from "../config.js";

// Resolve the first present value among candidate field names.
// The odcloud auto-generated APIs use slightly different keys per category,
// so we try several and fall back gracefully.
function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

// Normalize an API row into a stable internal shape.
function normalize(row, categoryLabel) {
  return {
    category: categoryLabel,
    id: pick(row, "HOUSE_MANAGE_NO", "PBLANC_NO"),
    name: pick(row, "HOUSE_NM", "BSNS_MBY_NM"),
    areaName: pick(row, "SUBSCRPT_AREA_CODE_NM"),
    address: pick(row, "HSSPLY_ADRES", "HSSPLY_ZIP"),
    // Announcement date (모집공고일)
    announceDate: pick(row, "RCRIT_PBLANC_DE"),
    // Receipt begin/end — try general-rank fields, then special-supply, then generic.
    receiptBegin: pick(
      row,
      "SUBSCRPT_RCEPT_BGNDE",
      "GNRL_RNK1_CRSPAREA_RCPTDE",
      "RCEPT_BGNDE",
      "SPSPLY_RCEPT_BGNDE",
    ),
    receiptEnd: pick(
      row,
      "SUBSCRPT_RCEPT_ENDDE",
      "GNRL_RNK2_ETC_GG_RCPTDE",
      "RCEPT_ENDDE",
    ),
    totalHouseholds: pick(row, "TOT_SUPLY_HSHLDCO"),
    url: pick(row, "PBLANC_URL", "HMPG_ADRES"),
  };
}

// Fetch one category, paging through all results, pre-filtered to 경기 and
// announcements within the lookback window (server-side cond filters).
async function fetchCategory(endpoint, sinceDate) {
  const out = [];
  let page = 1;

  // odcloud cond filter syntax: cond[FIELD::OP]=value (OP: EQ, GTE, LTE, LIKE...)
  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(config.perPage),
      serviceKey: config.serviceKey,
    });
    // Only listings announced on/after sinceDate.
    params.append("cond[RCRIT_PBLANC_DE::GTE]", sinceDate);

    const url = `${config.apiBase}/${endpoint.op}?${params.toString()}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(
        `API ${endpoint.op} failed: ${res.status} ${res.statusText}`,
      );
    }
    const json = await res.json();
    const rows = json.data ?? [];
    for (const row of rows) out.push(normalize(row, endpoint.label));

    const total = json.totalCount ?? out.length;
    if (rows.length === 0 || out.length >= total) break;
    page += 1;
  }
  return out;
}

// Fetch every configured category. A failing category is logged but does not
// abort the others (one bad endpoint shouldn't kill the run).
export async function fetchAllListings(sinceDate) {
  const results = [];
  for (const endpoint of config.endpoints) {
    try {
      const rows = await fetchCategory(endpoint, sinceDate);
      results.push(...rows);
    } catch (err) {
      console.error(`[warn] ${endpoint.label} (${endpoint.op}): ${err.message}`);
    }
  }
  // De-dup by id+category in case of overlap.
  const seen = new Set();
  return results.filter((r) => {
    if (!r.id) return false;
    const key = `${r.category}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
