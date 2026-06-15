// src/filter.js
// Region filtering. The API only narrows to 시/도, so 시·군·구 and 위례
// (which straddles 성남/하남/송파) are matched by keyword on name + address.

import { config } from "../config.js";

export function matchesRegion(listing) {
  const haystack = `${listing.name} ${listing.address} ${listing.areaName}`;

  // Reject explicit false positives first (e.g. 광주광역시 vs 경기 광주).
  if (config.region.excludeKeywords.some((kw) => haystack.includes(kw))) {
    return false;
  }
  return config.region.includeKeywords.some((kw) => haystack.includes(kw));
}

export function filterByRegion(listings) {
  return listings.filter(matchesRegion);
}
