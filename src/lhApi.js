// src/lhApi.js
// Source 2 — LH 분양임대공고문 (B552555). Status-based listings (no per-item dates).
// Response shape is quirky, so we recursively find the array of records.

import { config } from "../config.js";

// data.go.kr LH date params use dotted format: YYYY.MM.DD
function dotDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

// Recursively collect objects that look like LH notice records (have PAN_NM).
function findRecords(node, acc = []) {
  if (Array.isArray(node)) {
    for (const x of node) findRecords(x, acc);
  } else if (node && typeof node === "object") {
    if (typeof node.PAN_NM === "string") acc.push(node);
    else for (const v of Object.values(node)) findRecords(v, acc);
  }
  return acc;
}

function normalize(row, type) {
  const url = String(row.DTL_URL ?? "").trim();
  // Derive a stable id from the detail URL (contains PAN_ID) or the name.
  const panId = (url.match(/PAN_ID:(\d+)/) || [])[1] || String(row.PAN_NM ?? "");
  return {
    source: "LH",
    category: type.label,
    group: type.group,
    id: `${type.code}:${panId}`,
    name: String(row.PAN_NM ?? "").trim(),
    areaName: String(row.CNP_CD_NM ?? "").trim(),
    address: "",
    announceDate: String(row.PAN_NT_ST_DT ?? "").trim(), // sometimes present
    receiptBegin: "",
    receiptEnd: "",
    totalHouseholds: "",
    url,
    panStatus: String(row.PAN_SS ?? "").trim(),
    detailType: String(row.AIS_TP_CD_NM ?? "").trim(), // e.g. 행복주택
  };
}

async function fetchType(type, startDot, endDot) {
  const out = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      ServiceKey: config.serviceKey,
      PG_SZ: String(config.lh.pageSize),
      PAGE: String(page),
      UPP_AIS_TP_CD: type.code,
      CNP_CD: config.lh.regionCode,
      PAN_NT_ST_DT: startDot,
      CLSG_DT: endDot,
    });
    const res = await fetch(`${config.lh.base}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${type.label} ${res.status} ${res.statusText}`);
    const json = await res.json();
    const rows = findRecords(json);
    if (rows.length === 0) break;
    for (const row of rows) out.push(normalize(row, type));
    const total = Number(rows[0]?.ALL_CNT ?? out.length);
    if (out.length >= total || rows.length < config.lh.pageSize) break;
    page += 1;
  }
  return out;
}

export async function fetchLh(today, lookbackDays) {
  if (!config.lh.enabled) return [];
  const start = dotDate(new Date(today.getTime() - lookbackDays * 86400000));
  const end = dotDate(new Date(today.getTime() + 365 * 86400000));
  const results = [];
  for (const type of config.lh.types) {
    try {
      results.push(...(await fetchType(type, start, end)));
    } catch (err) {
      console.error(`[warn] LH ${type.label} (${type.code}): ${err.message}`);
    }
  }
  // De-dup by id.
  const seen = new Set();
  return results.filter((r) => {
    if (!r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
