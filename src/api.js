// src/api.js
// Source 1 — 청약홈 분양정보 (odcloud REST). Date-based listings.
// Normalizes every row into the shared internal shape.

import { config } from "../config.js";

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function normalize(row, endpoint) {
  return {
    source: "청약홈",
    category: endpoint.label,
    group: endpoint.group,
    id: pick(row, "HOUSE_MANAGE_NO", "PBLANC_NO"),
    name: pick(row, "HOUSE_NM", "BSNS_MBY_NM"),
    areaName: pick(row, "SUBSCRPT_AREA_CODE_NM"),
    address: pick(row, "HSSPLY_ADRES", "HSSPLY_ZIP"),
    announceDate: pick(row, "RCRIT_PBLANC_DE"),
    receiptBegin: pick(row, "SUBSCRPT_RCEPT_BGNDE", "GNRL_RNK1_CRSPAREA_RCPTDE", "RCEPT_BGNDE", "SPSPLY_RCEPT_BGNDE"),
    receiptEnd: pick(row, "SUBSCRPT_RCEPT_ENDDE", "GNRL_RNK2_ETC_GG_RCPTDE", "RCEPT_ENDDE"),
    totalHouseholds: pick(row, "TOT_SUPLY_HSHLDCO"),
    url: pick(row, "PBLANC_URL", "HMPG_ADRES"),
    detailType: pick(row, "HOUSE_SECD_NM", "HOUSE_DTL_SECD_NM"),
    panStatus: "",
  };
}

function buildUrl(endpoint, page, sinceDate, useCond) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(config.applyhome.perPage),
    serviceKey: config.serviceKey,
  });
  // Some categories (e.g. 공공지원임대) reject this filter → fetch without it.
  if (useCond) params.append("cond[RCRIT_PBLANC_DE::GTE]", sinceDate);
  return `${config.applyhome.base}/${endpoint.op}?${params.toString()}`;
}

async function fetchCategory(endpoint, sinceDate) {
  const out = [];
  let page = 1;
  let useCond = true;
  while (true) {
    let res = await fetch(buildUrl(endpoint, page, sinceDate, useCond), { headers: { Accept: "application/json" } });
    if (!res.ok && useCond) {
      // Retry this endpoint without the date filter (client-side filter still applies).
      useCond = false;
      res = await fetch(buildUrl(endpoint, page, sinceDate, false), { headers: { Accept: "application/json" } });
    }
    if (!res.ok) throw new Error(`${endpoint.op} ${res.status} ${res.statusText}`);
    const json = await res.json();
    const rows = json.data ?? [];
    for (const row of rows) out.push(normalize(row, endpoint));
    const total = json.totalCount ?? out.length;
    if (rows.length === 0 || out.length >= total) break;
    page += 1;
  }
  return out;
}

export async function fetchApplyhome(sinceDate) {
  const results = [];
  for (const endpoint of config.applyhome.endpoints) {
    try {
      results.push(...(await fetchCategory(endpoint, sinceDate)));
    } catch (err) {
      console.error(`[warn] 청약홈 ${endpoint.label} (${endpoint.op}): ${err.message}`);
    }
  }
  return results;
}
