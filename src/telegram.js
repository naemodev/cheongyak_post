// src/telegram.js
// Build and send Telegram messages.

import { config } from "../config.js";

const TYPE_LABEL = {
  announce: "📢 모집공고 게시",
  open: "✅ 청약접수 시작",
  closing: "⏰ 접수 마감 임박",
};

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Compose one message per event (clear and skimmable on mobile).
export function formatMessage(event) {
  const l = event.listing;
  const lines = [
    `<b>${TYPE_LABEL[event.type] ?? event.type}</b>`,
    `🏢 <b>${escapeHtml(l.name || "(이름 미상)")}</b>  <i>[${escapeHtml(l.category)}]</i>`,
  ];
  if (l.address) lines.push(`📍 ${escapeHtml(l.address)}`);
  if (l.announceDate) lines.push(`📅 공고일: ${escapeHtml(l.announceDate)}`);
  if (l.receiptBegin || l.receiptEnd) {
    lines.push(`🗓 접수: ${escapeHtml(l.receiptBegin || "?")} ~ ${escapeHtml(l.receiptEnd || "?")}`);
  }
  if (l.totalHouseholds) lines.push(`🏠 총 ${escapeHtml(l.totalHouseholds)}세대`);
  if (l.url) lines.push(`🔗 ${escapeHtml(l.url)}`);
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
