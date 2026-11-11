#!/usr/bin/env node
/**
 * Build a compact IANA timezone → ISO 3166-1 alpha-2 country map
 * from tzdata zone1970.tab, zone.tab, and the backward aliases file.
 *
 * Usage:
 *   node scripts/build-zone-countries.js
 *   node scripts/build-zone-countries.js --download
 *
 * Sources (public domain), preferred in this order:
 *   1. scripts/tzdata/ if present
 *   2. /usr/share/zoneinfo/ (tabs only; backward is often missing)
 *   3. https://raw.githubusercontent.com/eggert/tz/main/ (with --download, or if missing)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const LOCAL_DIR = path.join(__dirname, "tzdata");
const OUT = path.join(ROOT, "zone-countries.js");
const SOURCE_URLS = {
  "zone1970.tab": "https://raw.githubusercontent.com/eggert/tz/main/zone1970.tab",
  "zone.tab": "https://raw.githubusercontent.com/eggert/tz/main/zone.tab",
  backward: "https://raw.githubusercontent.com/eggert/tz/main/backward",
};

function fetch(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(url + " -> " + res.statusCode));
      }
      const chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    }).on("error", reject);
  });
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    return null;
  }
}

async function loadFile(name, forceDownload) {
  const local = path.join(LOCAL_DIR, name);
  const system = path.join("/usr/share/zoneinfo", name);
  if (!forceDownload) {
    const fromScript = readIfExists(local);
    if (fromScript) return { text: fromScript, source: local };
    const fromSystem = readIfExists(system);
    if (fromSystem) return { text: fromSystem, source: system };
  }
  const text = await fetch(SOURCE_URLS[name]);
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(local, text);
  return { text: text, source: SOURCE_URLS[name] };
}

function parseTab(text, map, onlyIfMissing) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.charAt(0) === "#") continue;
    const cols = line.split("\t");
    if (cols.length < 3) continue;
    const codes = cols[0].trim();
    const zone = cols[2].trim();
    if (!codes || !zone) continue;
    const country = codes.split(",")[0].trim();
    if (!/^[A-Z]{2}$/.test(country)) continue;
    if (onlyIfMissing && map[zone]) continue;
    map[zone] = country;
  }
}

function parseBackward(text) {
  const links = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.charAt(0) === "#") continue;
    const m = line.match(/^Link\s+(\S+)\s+(\S+)\s*$/);
    if (!m) continue;
    links[m[2]] = m[1];
  }
  return links;
}

function resolveTarget(name, links, seen) {
  let current = name;
  const guard = seen || {};
  while (links[current]) {
    if (guard[current]) break;
    guard[current] = true;
    current = links[current];
  }
  return current;
}

async function main() {
  const forceDownload = process.argv.indexOf("--download") !== -1;
  const sources = {};
  const zone1970 = await loadFile("zone1970.tab", forceDownload);
  const zoneTab = await loadFile("zone.tab", forceDownload);
  let backward;
  try {
    backward = await loadFile("backward", forceDownload);
  } catch (err) {
    if (!forceDownload) {
      backward = await loadFile("backward", true);
    } else {
      throw err;
    }
  }
  sources["zone1970.tab"] = zone1970.source;
  sources["zone.tab"] = zoneTab.source;
  sources.backward = backward.source;

  const map = {};
  parseTab(zone1970.text, map, false);
  parseTab(zoneTab.text, map, true);

  const links = parseBackward(backward.text);
  Object.keys(links).forEach(function (alias) {
    if (map[alias]) return;
    const target = resolveTarget(alias, links, {});
    if (map[target]) map[alias] = map[target];
  });

  // A few well-known aliases that may not appear in backward on every build.
  const extra = {
    "Asia/Calcutta": "Asia/Kolkata",
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "US/Hawaii": "Pacific/Honolulu",
    "US/Alaska": "America/Anchorage",
    "US/Arizona": "America/Phoenix",
    "Canada/Eastern": "America/Toronto",
    "Canada/Pacific": "America/Vancouver",
    "GB": "Europe/London",
    "GB-Eire": "Europe/London",
  };
  Object.keys(extra).forEach(function (alias) {
    if (map[alias]) return;
    const target = extra[alias];
    if (map[target]) map[alias] = map[target];
  });

  const keys = Object.keys(map).sort();
  const obj = {};
  keys.forEach(function (k) { obj[k] = map[k]; });

  const generatedAt = new Date().toISOString();
  const body = JSON.stringify(obj, null, 2);
  const file = `/**
 * Generated IANA timezone → ISO 3166-1 alpha-2 country map.
 * Do not edit by hand. Regenerate with: node scripts/build-zone-countries.js
 *
 * Generated: ${generatedAt}
 * Sources:
 *   zone1970.tab: ${sources["zone1970.tab"]}
 *   zone.tab: ${sources["zone.tab"]}
 *   backward: ${sources.backward}
 *
 * Country codes come from tzdata (public domain). The first country listed
 * for a zone in zone1970.tab is used when a zone covers more than one.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SomocloxZoneCountries = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return ${body};
});
`;
  fs.writeFileSync(OUT, file);
  console.log("Wrote " + path.relative(ROOT, OUT) + " with " + keys.length + " zones");
  const checks = {
    "Asia/Kolkata": "IN",
    "Asia/Calcutta": "IN",
    "America/New_York": "US",
    "US/Eastern": "US",
    "Australia/Sydney": "AU",
    "Asia/Tokyo": "JP",
    "Europe/London": "GB",
  };
  Object.keys(checks).forEach(function (z) {
    if (obj[z] !== checks[z]) {
      throw new Error("expected " + z + " -> " + checks[z] + ", got " + obj[z]);
    }
  });
  console.log("self-checks ok");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
