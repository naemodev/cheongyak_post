// src/telegram.js
// Build and send Telegram messages. Works for a personal chat, group, or channel.
// Signed by 청약우체부 📮.

import { config } from "../config.js";
import { matchEligibility, BASE_YEAR, tagsFor } from "./eligibility.js";

const TYPE_LABEL = {
  announce: "📢 모집공고 게시",
  open: "✅ 청약접수 시작",
  closing: "⏰ 접수 마감 임박",
};

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatMessage(event) {
  const l = event.listing;
  const cat = l.detailType ? `${l.category}·${l.detailType}` : l.category;
  const lines = [
    `<b>${TYPE_LABEL[event.type] ?? event.type}</b>`,
    `🏢 <b>${escapeHtml(l.name || "(이름 미상)")}</b>  <i>[${escapeHtml(l.source)} · ${escapeHtml(cat)}]</i>`,
  ];
  const t = tagsFor(l);
  const hashtags = [t.group, ...t.personas].filter(Boolean).map((x) => `#${x}`).join(" ");
  if (hashtags) lines.push(`🏷 ${escapeHtml(hashtags)}`);
  if (l.address) lines.push(`📍 ${escapeHtml(l.address)}`);
  else if (l.areaName) lines.push(`📍 ${escapeHtml(l.areaName)}`);
  if (l.announceDate) lines.push(`📅 공고일: ${escapeHtml(l.announceDate)}`);
  if (l.receiptBegin || l.receiptEnd) {
    lines.push(`🗓 접수: ${escapeHtml(l.receiptBegin || "?")} ~ ${escapeHtml(l.receiptEnd || "?")}`);
  } else if (l.panStatus) {
    lines.push(`🗓 공고상태: ${escapeHtml(l.panStatus)}`);
  }
  if (l.totalHouseholds) lines.push(`🏠 총 ${escapeHtml(l.totalHouseholds)}세대`);
  if (l.url) lines.push(`🔗 ${escapeHtml(l.url)}`);

  const e = matchEligibility(l);
  if (e) {
    const mark = { "가능": "✅", "조건부": "△", "불가": "❌" }[e.single] ?? "";
    lines.push("");
    lines.push(`👤 1인 가구: ${mark} ${escapeHtml(e.single)}`);
    lines.push(`💰 소득: ${escapeHtml(e.income)}`);
    lines.push(`🏦 자산: ${escapeHtml(e.asset)}`);
    lines.push(`<i>※ ${BASE_YEAR} 일반기준 참고용 — 정확한 자격은 공고문 확인</i>`);
  }

  lines.push("");
  lines.push("<i>— 청약우체부 📮</i>");
  return lines.join("\n");
}

export async function sendMessage(text) {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegram.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram send failed: ${res.status} ${body}`);
  }
}
