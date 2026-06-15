// index.js
// Entry point. Run order:
//   fetch → region filter → trigger events → drop already-sent → notify → save state.

import { config } from "./config.js";
import { fetchAllListings } from "./src/api.js";
import { filterByRegion } from "./src/filter.js";
import { eventsFor, kstToday } from "./src/triggers.js";
import { loadState, saveState, eventKey } from "./src/state.js";
import { formatMessage, sendMessage } from "./src/telegram.js";
import { writeSnapshot } from "./src/snapshot.js";
import { isoDay } from "./src/dates.js";

async function main() {
  if (!config.serviceKey) throw new Error("DATA_GO_KR_KEY is not set");

  const today = kstToday();
  const since = new Date(today.getTime() - config.triggers.lookbackDays * 86400000);

  const all = await fetchAllListings(isoDay(since));
  const regional = filterByRegion(all);
  console.log(`fetched ${all.length}, in-region ${regional.length}`);

  // Snapshot for the dashboard — same data that drives alerts.
  await writeSnapshot(regional);

  // Expand to events and drop ones we've already sent.
  const sent = await loadState();
  const newEvents = [];
  for (const listing of regional) {
    for (const event of eventsFor(listing, today)) {
      if (!sent.has(eventKey(event))) newEvents.push(event);
    }
  }
  console.log(`new events: ${newEvents.length}${config.seedMode ? " (SEED MODE — not sending)" : ""}`);

  for (const event of newEvents) {
    if (!config.seedMode) {
      await sendMessage(formatMessage(event));
    }
    sent.add(eventKey(event)); // record in both seed and normal mode
  }

  await saveState(sent);
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
