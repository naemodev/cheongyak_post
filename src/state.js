// src/state.js
// Dedup state. Records which (listing id + trigger type) have been sent so the
// same event never goes out twice across the 5 daily runs.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "../config.js";

export function eventKey(event) {
  return `${event.listing.category}:${event.listing.id}:${event.type}`;
}

export async function loadState() {
  try {
    const raw = await readFile(config.stateFile, "utf8");
    const parsed = JSON.parse(raw);
    return new Set(parsed.sent ?? []);
  } catch {
    return new Set(); // first run: no state yet
  }
}

export async function saveState(sentSet) {
  await mkdir(dirname(config.stateFile), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    sent: [...sentSet],
  };
  await writeFile(config.stateFile, JSON.stringify(payload, null, 2));
}
