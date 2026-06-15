// index.js
// Entry point. fetch (청약홈 + LH) → region filter → snapshot → events → notify → state.

import { config } from "./config.js";
import { fetchApplyhome } from "./src/api.js";
import { fetchLh } from "./src/lhApi.js";
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

  const [applyhome, lh] = await Promise.all([
    fetchApplyhome(isoDay(since)),
    fetchLh(today, config.triggers.lhLookbackDays),
  ]);
  const all = [...applyhome, ...lh];
  const regional = filterByRegion(all);
  console.log(`fetched 청약홈 ${applyhome.length} + LH ${lh.length} = ${all.length}, in-region ${regional.length}`);

  await writeSnapshot(regional);

  const sent = await loadState();
  const newEvents = [];
  for (const listing of regional) {
    for (const event of eventsFor(listing, today)) {
      if (!sent.has(eventKey(event))) newEvents.push(event);
    }
  }
  console.log(`new events: ${newEvents.length}${config.seedMode ? " (SEED MODE — not sending)" : ""}`);

  for (const event of newEvents) {
    if (!config.seedMode) await sendMessage(formatMessage(event));
    sent.add(eventKey(event));
  }

  await saveState(sent);
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
