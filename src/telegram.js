// src/telegram.js
// Build and send Telegram messages. One hashtag line; shortened title; link last.

import { config } from "../config.js";
import { matchEligibility, BASE_YEAR, tagList } from "./eligibility.js";

const TYPE_LABEL = {
  announce: "📢 모집공고 게시",
  open: "✅ 청약접수 시작",
  closing: "⏰ 접수 마감 임박",
};

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Trim boilerplate suffixes and cap length (full name is still in the link).
function shortenName(name) {
  let n = String(name || "").replace(/\s*(입주자\s*모집\s*공고|입주자모집공고|입주자모집|모집공고)\s*$/, "").trim();
  if (n.length > 46) n = n.slice(0, 46).trim() + "…";
  return n;
}

export function formatMessage(event) {
  const l = event.listing;
  const e = matchEligibility(l);
  const hashtags = tagList(l).map((x) => `#${x}`).join(" ");

  const L = [];
  L.push(`<b>${TYPE_LABEL[event.type] ?? event.type}</b>`);
  L.push("");
  L.push(`<b>${escapeHtml(shortenName(l.name) || "(이름 미상)")}</b>`);
  if (hashtags) L.push(escapeHtml(hashtags));
  L.push("");
  if (l.address) L.push(`📍 ${escapeHtml(l.address)}`);
  else if (l.areaName) L.push(`📍 ${escapeHtml(l.areaName)}`);
  if (l.announceDate) L.push(`📅 공고일  ${escapeHtml(l.announceDate)}`);
  if (l.receiptBegin || l.receiptEnd) L.push(`🗓 접수  ${escapeHtml(l.receiptBegin || "?")} ~ ${escapeHtml(l.receiptEnd || "?")}`);
  else if (l.panStatus) L.push(`🗓 공고상태  ${escapeHtml(l.panStatus)}`);
  if (l.totalHouseholds) L.push(`🏠 ${escapeHtml(l.totalHouseholds)}세대`);
  if (e) {
    const mark = { 가능: "✅", 조건부: "△", 불가: "❌" }[e.single] ?? "";
    L.push("");
    L.push("┄┄┄┄┄┄┄┄┄┄");
    L.push(`👤 1인 가구  ${mark} ${escapeHtml(e.single)}`);
    L.push(`💰 소득  ${escapeHtml(e.income)}`);
    L.push(`🏦 자산  ${escapeHtml(e.asset)}`);
    L.push(`<i>※ ${BASE_YEAR} 일반기준 · 정확한 자격은 공고문 확인</i>`);
  }
  if (l.url) {
    L.push("");
    L.push(`🔗 <a href="${escapeHtml(l.url)}">공고 자세히 보기 →</a>`);
  }
  return L.join("\n");
}

export async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.telegram.chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}
