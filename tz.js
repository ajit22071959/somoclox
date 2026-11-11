/**
 * somoclox timezone helpers — pure functions, used by the page and by Node tests.
 *
 * All conversions use the browser/Node Intl timezone data for the exact
 * instant involved, so DST is correct for the chosen date, not today's offset.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Somoclox = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MINUTE = 60000;
  const HOUR = 3600000;
  const DAY = 86400000;

  const ZONE_COUNTRIES = (function loadZoneCountries() {
    if (typeof require === "function") {
      try {
        return require("./zone-countries.js");
      } catch (err) {
        // fall through to a global, for the browser
      }
    }
    const root = typeof globalThis !== "undefined" ? globalThis : {};
    return root.SomocloxZoneCountries || {};
  })();

  const DEFAULT_CITIES = [
    { timeZone: "America/New_York", label: "New York" },
    { timeZone: "America/Los_Angeles", label: "Los Angeles" },
    { timeZone: "America/Chicago", label: "Chicago" },
    { timeZone: "America/Toronto", label: "Toronto" },
    { timeZone: "America/Sao_Paulo", label: "São Paulo" },
    { timeZone: "Europe/London", label: "London" },
    { timeZone: "Europe/Paris", label: "Paris" },
    { timeZone: "Europe/Berlin", label: "Berlin" },
    { timeZone: "Asia/Dubai", label: "Dubai" },
    { timeZone: "Asia/Kolkata", label: "Mumbai" },
    { timeZone: "Asia/Singapore", label: "Singapore" },
    { timeZone: "Asia/Hong_Kong", label: "Hong Kong" },
    { timeZone: "Asia/Shanghai", label: "Shanghai" },
    { timeZone: "Asia/Tokyo", label: "Tokyo" },
    { timeZone: "Australia/Sydney", label: "Sydney" },
  ];

  const DISPLAY_NAMES = {
    "America/New_York": "New York, America",
    "America/Los_Angeles": "Los Angeles, America",
    "America/Chicago": "Chicago, America",
    "America/Toronto": "Toronto, America",
    "America/Sao_Paulo": "São Paulo, America",
    "America/Mexico_City": "Mexico City, America",
    "America/Denver": "Denver, America",
    "America/Phoenix": "Phoenix, America",
    "America/Anchorage": "Anchorage, America",
    "America/Vancouver": "Vancouver, America",
    "America/Argentina/Buenos_Aires": "Buenos Aires, America",
    "Europe/London": "London, Europe",
    "Europe/Paris": "Paris, Europe",
    "Europe/Berlin": "Berlin, Europe",
    "Europe/Amsterdam": "Amsterdam, Europe",
    "Europe/Madrid": "Madrid, Europe",
    "Europe/Rome": "Rome, Europe",
    "Europe/Zurich": "Zurich, Europe",
    "Europe/Stockholm": "Stockholm, Europe",
    "Europe/Dublin": "Dublin, Europe",
    "Europe/Lisbon": "Lisbon, Europe",
    "Europe/Moscow": "Moscow, Europe",
    "Europe/Istanbul": "Istanbul, Europe",
    "Africa/Cairo": "Cairo, Africa",
    "Africa/Johannesburg": "Johannesburg, Africa",
    "Africa/Lagos": "Lagos, Africa",
    "Africa/Nairobi": "Nairobi, Africa",
    "Asia/Dubai": "Dubai, Asia",
    "Asia/Kolkata": "Mumbai, Asia",
    "Asia/Calcutta": "Mumbai, Asia",
    "Asia/Kathmandu": "Kathmandu, Asia",
    "Asia/Dhaka": "Dhaka, Asia",
    "Asia/Karachi": "Karachi, Asia",
    "Asia/Colombo": "Colombo, Asia",
    "Asia/Singapore": "Singapore, Asia",
    "Asia/Hong_Kong": "Hong Kong, Asia",
    "Asia/Shanghai": "Shanghai, Asia",
    "Asia/Tokyo": "Tokyo, Asia",
    "Asia/Seoul": "Seoul, Asia",
    "Asia/Bangkok": "Bangkok, Asia",
    "Asia/Jakarta": "Jakarta, Asia",
    "Asia/Manila": "Manila, Asia",
    "Asia/Taipei": "Taipei, Asia",
    "Australia/Sydney": "Sydney, Australia",
    "Australia/Melbourne": "Melbourne, Australia",
    "Australia/Perth": "Perth, Australia",
    "Pacific/Auckland": "Auckland, Pacific",
    "Pacific/Honolulu": "Honolulu, Pacific",
    "Pacific/Fiji": "Fiji, Pacific",
    "UTC": "UTC",
  };

  const ZONE_LINKS = {
    "Asia/Calcutta": "Asia/Kolkata",
    "Asia/Katmandu": "Asia/Kathmandu",
    "Asia/Saigon": "Asia/Ho_Chi_Minh",
    "Europe/Kiev": "Europe/Kyiv",
    "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
    "America/Indianapolis": "America/Indiana/Indianapolis",
    "America/Fort_Wayne": "America/Indiana/Indianapolis",
    "America/Louisville": "America/Kentucky/Louisville",
    "Pacific/Samoa": "Pacific/Pago_Pago",
    "US/Eastern": "America/New_York",
    "US/Central": "America/Chicago",
    "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles",
    "US/Hawaii": "Pacific/Honolulu",
    "US/Alaska": "America/Anchorage",
  };

  let cachedZones = null;

  const ALIASES = {
    "Asia/Kolkata": [
      "Mumbai", "Bombay", "Calcutta", "Kolkata", "India", "Delhi",
      "New Delhi", "Bengaluru", "Bangalore", "Chennai", "Hyderabad",
      "Pune", "IST",
    ],
    "Asia/Kathmandu": ["Nepal", "Kathmandu", "NPT"],
    "America/New_York": [
      "New York", "NYC", "Eastern", "EST", "EDT", "Washington",
      "Boston", "Miami", "Philadelphia",
    ],
    "America/Chicago": ["Chicago", "Central", "CST", "CDT", "Houston", "Dallas"],
    "America/Denver": ["Denver", "Mountain", "MST", "MDT"],
    "America/Los_Angeles": [
      "Los Angeles", "LA", "Pacific", "PST", "PDT", "San Francisco",
      "Seattle", "California",
    ],
    "America/Sao_Paulo": ["Sao Paulo", "São Paulo", "Brazil", "BRT"],
    "Europe/London": ["London", "UK", "Britain", "England", "GMT", "BST", "United Kingdom"],
    "Europe/Paris": ["Paris", "France", "CET", "CEST"],
    "Europe/Berlin": ["Berlin", "Germany", "CET", "CEST"],
    "Asia/Dubai": ["Dubai", "UAE", "GST"],
    "Asia/Tokyo": ["Tokyo", "Japan", "JST"],
    "Asia/Shanghai": ["Shanghai", "Beijing", "China", "CST"],
    "Asia/Hong_Kong": ["Hong Kong", "HKT"],
    "Asia/Singapore": ["Singapore", "SGT"],
    "Australia/Sydney": ["Sydney", "Australia", "AEDT", "AEST"],
    "Pacific/Auckland": ["Auckland", "New Zealand", "NZDT", "NZST"],
    "UTC": ["UTC", "GMT", "Zulu"],
  };

  const FALLBACK_ZONES = [
    "UTC",
    "Africa/Cairo", "Africa/Casablanca", "Africa/Johannesburg", "Africa/Lagos",
    "Africa/Nairobi",
    "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
    "America/Caracas", "America/Chicago", "America/Denver", "America/Halifax",
    "America/Los_Angeles", "America/Mexico_City", "America/New_York",
    "America/Phoenix", "America/Santiago", "America/Sao_Paulo",
    "America/St_Johns", "America/Toronto", "America/Vancouver",
    "Asia/Bangkok", "Asia/Colombo", "Asia/Dhaka", "Asia/Dubai",
    "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Karachi", "Asia/Kathmandu",
    "Asia/Kolkata", "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Riyadh",
    "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei",
    "Asia/Tehran", "Asia/Tokyo",
    "Atlantic/Azores", "Atlantic/Reykjavik",
    "Australia/Adelaide", "Australia/Brisbane", "Australia/Melbourne",
    "Australia/Perth", "Australia/Sydney",
    "Europe/Amsterdam", "Europe/Athens", "Europe/Berlin", "Europe/Brussels",
    "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Lisbon",
    "Europe/London", "Europe/Madrid", "Europe/Moscow", "Europe/Paris",
    "Europe/Rome", "Europe/Stockholm", "Europe/Warsaw", "Europe/Zurich",
    "Pacific/Auckland", "Pacific/Fiji", "Pacific/Honolulu", "Pacific/Midway",
  ];

  function toMs(instant) {
    if (instant instanceof Date) return instant.getTime();
    if (typeof instant === "number" && Number.isFinite(instant)) return instant;
    throw new TypeError("instant must be a Date or a number of milliseconds");
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  const DTF_CACHE = {};

  function cachedFormat(kind, timeZone, options) {
    const key = kind + "|" + timeZone;
    let dtf = DTF_CACHE[key];
    if (!dtf) {
      dtf = new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: timeZone }, options));
      DTF_CACHE[key] = dtf;
    }
    return dtf;
  }

  function getOffsetMs(timeZone, instant) {
    const date = new Date(toMs(instant));
    const dtf = cachedFormat("off", timeZone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const bag = {};
    for (const part of dtf.formatToParts(date)) {
      if (part.type !== "literal") bag[part.type] = part.value;
    }
    const asUtc = Date.UTC(
      Number(bag.year),
      Number(bag.month) - 1,
      Number(bag.day),
      Number(bag.hour),
      Number(bag.minute),
      Number(bag.second),
      date.getMilliseconds()
    );
    return asUtc - date.getTime();
  }

  function formatOffsetLabel(offsetMs) {
    const sign = offsetMs < 0 ? "-" : "+";
    const abs = Math.abs(offsetMs);
    const hours = Math.floor(abs / HOUR);
    const minutes = Math.round((abs % HOUR) / MINUTE);
    if (minutes === 0) return "UTC" + sign + hours;
    return "UTC" + sign + hours + ":" + pad2(minutes);
  }

  function getWallParts(timeZone, instant) {
    const date = new Date(toMs(instant));
    const dtf = cachedFormat("wall", timeZone, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "long",
      hourCycle: "h23",
    });
    const bag = {};
    for (const part of dtf.formatToParts(date)) {
      if (part.type !== "literal") bag[part.type] = part.value;
    }
    const offsetMs = getOffsetMs(timeZone, date);
    return {
      year: Number(bag.year),
      month: Number(bag.month),
      day: Number(bag.day),
      hour: Number(bag.hour),
      minute: Number(bag.minute),
      second: Number(bag.second),
      weekday: bag.weekday,
      offsetMs: offsetMs,
      offsetLabel: formatOffsetLabel(offsetMs),
      timeZone: timeZone,
    };
  }

  function wallEquals(wall, wanted, withSeconds) {
    if (
      wall.year !== wanted.year ||
      wall.month !== wanted.month ||
      wall.day !== wanted.day ||
      wall.hour !== wanted.hour ||
      wall.minute !== wanted.minute
    ) {
      return false;
    }
    if (withSeconds && (wanted.second || 0) !== (wall.second || 0)) return false;
    return true;
  }

  function uniqueOffsetsAround(timeZone, wantedMs) {
    const probes = [
      wantedMs - 36 * HOUR,
      wantedMs - 26 * HOUR,
      wantedMs - 12 * HOUR,
      wantedMs,
      wantedMs + 12 * HOUR,
      wantedMs + 26 * HOUR,
      wantedMs + 36 * HOUR,
    ];
    const seen = [];
    for (const t of probes) {
      const off = getOffsetMs(timeZone, t);
      if (seen.indexOf(off) === -1) seen.push(off);
    }
    return seen;
  }

  function dstBoundsForYear(timeZone, year) {
    const jan = getOffsetMs(timeZone, Date.UTC(year, 0, 15, 12));
    const jul = getOffsetMs(timeZone, Date.UTC(year, 6, 15, 12));
    return { jan: jan, jul: jul, hasDST: jan !== jul, dstOffset: Math.max(jan, jul), stdOffset: Math.min(jan, jul) };
  }

  function getDSTInfo(timeZone, instant) {
    const ms = toMs(instant);
    const year = getWallParts(timeZone, ms).year;
    const bounds = dstBoundsForYear(timeZone, year);
    const offsetMs = getOffsetMs(timeZone, ms);
    return {
      hasDST: bounds.hasDST,
      inDST: bounds.hasDST && offsetMs === bounds.dstOffset,
      offsetMs: offsetMs,
      stdOffset: bounds.stdOffset,
      dstOffset: bounds.dstOffset,
    };
  }

  function resolveLocal(timeZone, parts) {
    const wanted = {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second) || 0,
    };
    const wantedMs = Date.UTC(
      wanted.year,
      wanted.month - 1,
      wanted.day,
      wanted.hour,
      wanted.minute,
      wanted.second
    );
    const offsets = uniqueOffsetsAround(timeZone, wantedMs);
    const valid = [];
    for (let i = 0; i < offsets.length; i++) {
      const off = offsets[i];
      const t = wantedMs - off;
      if (getOffsetMs(timeZone, t) === off && wallEquals(getWallParts(timeZone, t), wanted, true)) {
        valid.push(t);
      }
    }
    valid.sort(function (a, b) { return a - b; });

    if (valid.length === 1) {
      return {
        kind: "unique",
        instant: valid[0],
        instants: valid,
        wall: getWallParts(timeZone, valid[0]),
        wanted: wanted,
        timeZone: timeZone,
        note: null,
      };
    }

    if (valid.length >= 2) {
      return {
        kind: "ambiguous",
        instant: valid[0],
        instants: valid,
        wall: getWallParts(timeZone, valid[0]),
        wanted: wanted,
        timeZone: timeZone,
        note:
          "This local time occurs twice when clocks fall back. Showing the earlier occurrence first.",
      };
    }

    // Gap: the local time does not exist (spring forward).
    // Shift forward: use the offset from before the gap so the instant
    // lands after the jump, and the wall clock moves forward by the gap.
    const beforeOff = getOffsetMs(timeZone, wantedMs - 26 * HOUR);
    const afterOff = getOffsetMs(timeZone, wantedMs + 26 * HOUR);
    const shifted = wantedMs - beforeOff;
    const wall = getWallParts(timeZone, shifted);
    return {
      kind: "gap",
      instant: shifted,
      instants: [shifted],
      wall: wall,
      wanted: wanted,
      timeZone: timeZone,
      beforeOffsetMs: beforeOff,
      afterOffsetMs: afterOff,
      note:
        "This local time is skipped when clocks spring forward. Showing the time after the jump.",
    };
  }

  function calendarDiffDays(fromWall, toWall) {
    const a = Date.UTC(fromWall.year, fromWall.month - 1, fromWall.day);
    const b = Date.UTC(toWall.year, toWall.month - 1, toWall.day);
    return Math.round((b - a) / DAY);
  }

  function dayShiftLabel(fromWall, toWall) {
    const diff = calendarDiffDays(fromWall, toWall);
    if (diff === 0) return "same day";
    if (diff === 1) return "next day";
    if (diff === -1) return "previous day";
    if (diff > 1) return diff + " days later";
    return Math.abs(diff) + " days earlier";
  }

  function formatDuration(minutes) {
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (h === 0) return m + "m";
    if (m === 0) return h + "h";
    return h + "h " + m + "m";
  }

  function shortName(timeZone) {
    if (timeZone === "UTC") return "UTC";
    const resolved = resolveZone(timeZone);
    const def = DEFAULT_CITIES.find(function (c) { return sameZone(c.timeZone, resolved); });
    if (def) return def.label;
    const parts = (ZONE_LINKS[timeZone] || timeZone).split("/");
    return parts[parts.length - 1].replace(/_/g, " ");
  }

  function friendlyName(timeZone) {
    const resolved = resolveZone(timeZone);
    const preferred = preferredZone(timeZone);
    if (DISPLAY_NAMES[resolved]) return DISPLAY_NAMES[resolved];
    if (DISPLAY_NAMES[preferred]) return DISPLAY_NAMES[preferred];
    if (DISPLAY_NAMES[timeZone]) return DISPLAY_NAMES[timeZone];
    const parts = preferred.split("/");
    const city = parts[parts.length - 1].replace(/_/g, " ");
    const region = parts[0].replace(/_/g, " ");
    if (parts.length === 1) return city;
    return city + ", " + region;
  }

  function aliasesFor(timeZone) {
    const out = [];
    Object.keys(ALIASES).forEach(function (key) {
      if (sameZone(key, timeZone)) {
        ALIASES[key].forEach(function (name) {
          if (out.indexOf(name) === -1) out.push(name);
        });
      }
    });
    return out;
  }

  function describeGap(fromZone, toZone, instant, names) {
    const fromOff = getOffsetMs(fromZone, instant);
    const toOff = getOffsetMs(toZone, instant);
    const minutes = Math.round((toOff - fromOff) / MINUTE);
    const fromName = (names && names.from) || shortName(fromZone);
    const toName = (names && names.to) || shortName(toZone);
    let label;
    if (minutes === 0) {
      label = toName + " is the same time as " + fromName;
    } else if (minutes > 0) {
      label = toName + " is " + formatDuration(minutes) + " ahead of " + fromName;
    } else {
      label = toName + " is " + formatDuration(minutes) + " behind " + fromName;
    }
    return {
      minutes: minutes,
      ahead: minutes > 0,
      behind: minutes < 0,
      label: label,
    };
  }

  function convert(fromZone, toZone, parts) {
    const resolved = resolveLocal(fromZone, parts);
    const toWall = getWallParts(toZone, resolved.instant);
    const gap = describeGap(fromZone, toZone, resolved.instant);
    const now = Date.now();
    const gapToday = describeGap(fromZone, toZone, now);
    const targets = Array.isArray(toZone) ? null : undefined;
    return {
      kind: resolved.kind,
      note: resolved.note,
      instant: resolved.instant,
      instants: resolved.instants,
      from: {
        timeZone: fromZone,
        wall: resolved.wall,
        wanted: resolved.wanted,
      },
      to: {
        timeZone: toZone,
        wall: toWall,
      },
      dayShift: dayShiftLabel(resolved.wall, toWall),
      gap: gap,
      gapToday: gapToday,
      gapDiffersFromToday: gap.minutes !== gapToday.minutes,
    };
  }

  function convertMany(fromZone, toZones, parts) {
    const resolved = resolveLocal(fromZone, parts);
    const now = Date.now();
    const results = toZones.map(function (toZone) {
      const toWall = getWallParts(toZone, resolved.instant);
      const gap = describeGap(fromZone, toZone, resolved.instant);
      const gapToday = describeGap(fromZone, toZone, now);
      return {
        timeZone: toZone,
        wall: toWall,
        dayShift: dayShiftLabel(resolved.wall, toWall),
        gap: gap,
        gapToday: gapToday,
        gapDiffersFromToday: gap.minutes !== gapToday.minutes,
      };
    });
    const ambiguousWalls = (resolved.instants || []).map(function (t) {
      return {
        instant: t,
        from: getWallParts(fromZone, t),
        targets: toZones.map(function (z) {
          return { timeZone: z, wall: getWallParts(z, t) };
        }),
      };
    });
    return {
      kind: resolved.kind,
      note: resolved.note,
      instant: resolved.instant,
      instants: resolved.instants,
      from: {
        timeZone: fromZone,
        wall: resolved.wall,
        wanted: resolved.wanted,
      },
      results: results,
      ambiguousWalls: resolved.kind === "ambiguous" ? ambiguousWalls : null,
    };
  }

  function nextOffsetChange(timeZone, fromInstant, withinDays) {
    const days = withinDays == null ? 30 : withinDays;
    const start = toMs(fromInstant);
    const end = start + days * DAY;
    const step = 6 * HOUR;
    let prevOff = getOffsetMs(timeZone, start);
    let prevT = start;
    for (let t = start + step; t <= end + step; t += step) {
      const probe = Math.min(t, end);
      const off = getOffsetMs(timeZone, probe);
      if (off !== prevOff) {
        let lo = prevT;
        let hi = probe;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (getOffsetMs(timeZone, mid) === prevOff) lo = mid;
          else hi = mid;
        }
        const changeAt = hi;
        if (changeAt <= end) {
          return {
            at: changeAt,
            before: lo,
            fromOffsetMs: prevOff,
            toOffsetMs: getOffsetMs(timeZone, changeAt),
            wall: getWallParts(timeZone, changeAt),
          };
        }
      }
      prevOff = off;
      prevT = probe;
      if (t >= end) break;
    }
    return null;
  }

  function formatYmd(wall) {
    return wall.year + "-" + pad2(wall.month) + "-" + pad2(wall.day);
  }

  function dstWarnings(zones, fromInstant, withinDays, referenceZone) {
    const start = fromInstant == null ? Date.now() : toMs(fromInstant);
    const warnings = [];
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const change = nextOffsetChange(zone, start, withinDays);
      if (!change) continue;
      const dateLabel = formatYmd(change.wall);
      let text = "Clocks change in " + shortName(zone) + " on " + dateLabel + ".";
      if (referenceZone && referenceZone !== zone) {
        const gapBefore = describeGap(referenceZone, zone, change.before);
        const gapAfter = describeGap(referenceZone, zone, change.at);
        if (gapBefore.minutes !== gapAfter.minutes) {
          text =
            "Clocks change in " + shortName(zone) + " on " + dateLabel +
            ": the gap to " + shortName(referenceZone) + " shifts.";
        }
      }
      warnings.push({
        timeZone: zone,
        at: change.at,
        date: dateLabel,
        text: text,
        fromOffsetMs: change.fromOffsetMs,
        toOffsetMs: change.toOffsetMs,
      });
    }
    return warnings;
  }

  function parseHm(value) {
    if (typeof value === "number") return value;
    const m = String(value).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) throw new Error("invalid time of day: " + value);
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) throw new Error("invalid time of day: " + value);
    return h * 60 + min;
  }

  function addDays(year, month, day, delta) {
    const dt = new Date(Date.UTC(year, month - 1, day + delta));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  function workIntervalOnDate(timeZone, year, month, day, startMin, endMin) {
    function atMinutes(y, m, d, mins) {
      const h = Math.floor(mins / 60);
      const mi = mins % 60;
      return resolveLocal(timeZone, {
        year: y, month: m, day: d, hour: h, minute: mi, second: 0,
      }).instant;
    }
    if (endMin === startMin) {
      return [];
    }
    if (endMin > startMin) {
      return [{ start: atMinutes(year, month, day, startMin), end: atMinutes(year, month, day, endMin) }];
    }
    const next = addDays(year, month, day, 1);
    return [{
      start: atMinutes(year, month, day, startMin),
      end: atMinutes(next.year, next.month, next.day, endMin),
    }];
  }

  function intersectIntervals(a, b) {
    const out = [];
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const start = Math.max(a[i].start, b[j].start);
        const end = Math.min(a[i].end, b[j].end);
        if (end > start) out.push({ start: start, end: end });
      }
    }
    return out;
  }

  function defaultWorkMinutes(options) {
    const startMin = options.workStartMin != null ? options.workStartMin : parseHm(options.workStart || "09:00");
    const endMin = options.workEndMin != null ? options.workEndMin : parseHm(options.workEnd || "18:00");
    return { startMin: startMin, endMin: endMin };
  }

  function meetingParticipants(options) {
    const defaults = defaultWorkMinutes(options);
    const hours = options.hours || [];
    const zones = options.zones || [];
    const out = [];
    for (let i = 0; i < zones.length; i++) {
      const item = zones[i];
      const isObj = item && typeof item === "object";
      const timeZone = isObj ? (item.timeZone || item.tz) : item;
      if (!timeZone) continue;
      const row = hours[i] || {};
      const startSrc = row.workStart || row.start || (isObj && (item.workStart || item.start)) || null;
      const endSrc = row.workEnd || row.end || (isObj && (item.workEnd || item.end)) || null;
      out.push({
        timeZone: timeZone,
        label: (isObj && item.label) || shortName(timeZone),
        startMin: startSrc != null && startSrc !== "" ? parseHm(startSrc) : defaults.startMin,
        endMin: endSrc != null && endSrc !== "" ? parseHm(endSrc) : defaults.endMin,
      });
    }
    return out;
  }

  function workIntervalsAround(timeZone, date, startMin, endMin, dayRadius) {
    const radius = dayRadius == null ? 1 : dayRadius;
    const out = [];
    for (let delta = -radius; delta <= radius; delta++) {
      const d = addDays(date.year, date.month, date.day, delta);
      const ivs = workIntervalOnDate(timeZone, d.year, d.month, d.day, startMin, endMin);
      for (let i = 0; i < ivs.length; i++) out.push(ivs[i]);
    }
    return out;
  }

  function overlapsRange(iv, start, end) {
    return iv.end > start && iv.start < end;
  }

  function clipInterval(iv, start, end) {
    const s = Math.max(iv.start, start);
    const e = Math.min(iv.end, end);
    if (e <= s) return null;
    return { start: s, end: e };
  }

  function axisDayBounds(axisZone, date) {
    const dayStart = resolveLocal(axisZone, {
      year: date.year, month: date.month, day: date.day, hour: 0, minute: 0, second: 0,
    }).instant;
    const next = addDays(date.year, date.month, date.day, 1);
    const dayEnd = resolveLocal(axisZone, {
      year: next.year, month: next.month, day: next.day, hour: 0, minute: 0, second: 0,
    }).instant;
    return { dayStart: dayStart, dayEnd: dayEnd };
  }

  function comboGap(intervals) {
    let start = intervals[0].start;
    let end = intervals[0].end;
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start > start) start = intervals[i].start;
      if (intervals[i].end < end) end = intervals[i].end;
    }
    return { start: start, end: end, gapMin: Math.round((start - end) / MINUTE) };
  }

  function eachCombo(lists, choose) {
    const chosen = [];
    function walk(i) {
      if (i === lists.length) {
        choose(chosen.slice());
        return;
      }
      const list = lists[i];
      if (!list.length) return;
      for (let j = 0; j < list.length; j++) {
        chosen[i] = list[j];
        walk(i + 1);
      }
    }
    walk(0);
  }

  function findNearMiss(lanes, dayStart, dayEnd) {
    if (!lanes || lanes.length < 2) return null;
    const lists = lanes.map(function (lane) { return lane.intervals || []; });
    let best = null;
    eachCombo(lists, function (combo) {
      const gap = comboGap(combo);
      if (gap.gapMin <= 0) return;
      const regionStart = Math.min.apply(null, combo.map(function (iv) { return iv.start; }));
      const regionEnd = Math.max.apply(null, combo.map(function (iv) { return iv.end; }));
      if (regionEnd <= dayStart - DAY || regionStart >= dayEnd + DAY) return;
      const mid = (Math.max(gap.end, dayStart) + Math.min(gap.start, dayEnd)) / 2;
      const dist = Math.min(Math.abs(mid - dayStart), Math.abs(mid - dayEnd), Math.abs(mid - (dayStart + dayEnd) / 2));
      if (!best || gap.gapMin < best.gapMin || (gap.gapMin === best.gapMin && dist < best.dist)) {
        best = {
          gapMin: gap.gapMin,
          dist: dist,
          combo: combo,
          gapStart: gap.end,
          gapEnd: gap.start,
        };
      }
    });
    if (!best) return null;
    const windows = lanes.map(function (lane, i) {
      const iv = best.combo[i];
      return {
        timeZone: lane.timeZone,
        label: lane.label,
        start: getWallParts(lane.timeZone, iv.start),
        end: getWallParts(lane.timeZone, iv.end),
        interval: iv,
      };
    });
    const names = windows.map(function (w) {
      return w.label + " " + pad2(w.start.hour) + ":" + pad2(w.start.minute) +
        "–" + pad2(w.end.hour) + ":" + pad2(w.end.minute);
    });
    return {
      gapMin: best.gapMin,
      windows: windows,
      text: "The closest working windows are " + formatDuration(best.gapMin) + " apart: " +
        names.join(" and ") + ".",
    };
  }

  function findMeetingOverlap(options) {
    const defaults = defaultWorkMinutes(options);
    const participants = meetingParticipants(options);
    if (!participants.length) {
      return {
        intervals: [],
        none: true,
        formatted: [],
        lanes: [],
        nearMiss: null,
        workStartMin: defaults.startMin,
        workEndMin: defaults.endMin,
      };
    }
    const date = options.date;
    const axisZone = options.axisZone || participants[0].timeZone;
    const bounds = axisDayBounds(axisZone, date);
    const lanes = participants.map(function (p) {
      return {
        timeZone: p.timeZone,
        label: p.label,
        startMin: p.startMin,
        endMin: p.endMin,
        intervals: workIntervalsAround(p.timeZone, date, p.startMin, p.endMin, 1),
      };
    });
    let current = null;
    for (let i = 0; i < lanes.length; i++) {
      current = current == null ? lanes[i].intervals.slice() : intersectIntervals(current, lanes[i].intervals);
    }
    const intervals = (current || []).map(function (iv) {
      return clipInterval(iv, bounds.dayStart, bounds.dayEnd);
    }).filter(Boolean);
    const formatted = intervals.map(function (iv) {
      return {
        start: iv.start,
        end: iv.end,
        durationMin: Math.round((iv.end - iv.start) / MINUTE),
        inZones: participants.map(function (p) {
          return {
            timeZone: p.timeZone,
            label: p.label,
            start: getWallParts(p.timeZone, iv.start),
            end: getWallParts(p.timeZone, iv.end),
          };
        }),
      };
    });
    const nearMiss = intervals.length ? null : findNearMiss(lanes, bounds.dayStart, bounds.dayEnd);
    return {
      intervals: intervals,
      none: intervals.length === 0,
      formatted: formatted,
      lanes: lanes,
      axisZone: axisZone,
      dayStart: bounds.dayStart,
      dayEnd: bounds.dayEnd,
      nearMiss: nearMiss,
      workStartMin: defaults.startMin,
      workEndMin: defaults.endMin,
    };
  }

  function listTimeZones() {
    if (cachedZones) return cachedZones.slice();
    let values = null;
    if (typeof Intl.supportedValuesOf === "function") {
      try {
        values = Intl.supportedValuesOf("timeZone");
      } catch (err) {
        values = null;
      }
    }
    cachedZones = (values && values.length) ? values.slice() : FALLBACK_ZONES.slice();
    return cachedZones.slice();
  }

  function preferredZone(timeZone) {
    return ZONE_LINKS[timeZone] || timeZone;
  }

  function resolveZone(timeZone) {
    if (!timeZone) return timeZone;
    const preferred = preferredZone(timeZone);
    const list = cachedZones || listTimeZones();
    if (list.indexOf(preferred) !== -1) return preferred;
    if (list.indexOf(timeZone) !== -1) return timeZone;
    const partners = [timeZone, preferred];
    Object.keys(ZONE_LINKS).forEach(function (from) {
      const to = ZONE_LINKS[from];
      if (from === timeZone || to === timeZone || from === preferred || to === preferred) {
        partners.push(from, to);
      }
    });
    for (let i = 0; i < partners.length; i++) {
      if (list.indexOf(partners[i]) !== -1) return partners[i];
    }
    return preferred;
  }

  function sameZone(a, b) {
    return resolveZone(a) === resolveZone(b);
  }

  const COUNTRY_ALIASES = {
    US: ["USA", "US", "America", "United States", "United States of America", "U.S.", "U.S.A."],
    GB: ["UK", "U.K.", "Britain", "Great Britain", "England", "United Kingdom", "Scotland", "Wales"],
    AE: ["UAE", "U.A.E.", "Emirates", "United Arab Emirates"],
    KR: ["South Korea", "Korea", "Republic of Korea", "ROK"],
    KP: ["North Korea", "DPRK"],
    RU: ["Russia", "Russian Federation"],
    CZ: ["Czechia", "Czech Republic"],
    VN: ["Vietnam", "Viet Nam"],
    NL: ["Netherlands", "Holland"],
    CH: ["Switzerland"],
    TR: ["Turkey", "Turkiye", "Türkiye"],
    IR: ["Iran", "Persia"],
    MM: ["Myanmar", "Burma"],
    TW: ["Taiwan", "Republic of China"],
    HK: ["Hong Kong", "Hong Kong SAR", "Hong Kong SAR China"],
    MO: ["Macau", "Macao"],
    CN: ["China", "PRC", "People's Republic of China"],
    IN: ["India", "Bharat", "Hindustan"],
    LK: ["Sri Lanka", "Ceylon"],
    CI: ["Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire"],
    CD: ["DR Congo", "DRC", "Democratic Republic of the Congo", "Congo-Kinshasa"],
    CG: ["Congo-Brazzaville", "Republic of the Congo"],
    ZA: ["South Africa"],
    NZ: ["New Zealand"],
    AU: ["Australia"],
    CA: ["Canada"],
    MX: ["Mexico"],
    BR: ["Brazil"],
    AR: ["Argentina"],
    CL: ["Chile"],
    PE: ["Peru"],
    CO: ["Colombia"],
    VE: ["Venezuela"],
    EG: ["Egypt"],
    SA: ["Saudi Arabia", "KSA"],
    PK: ["Pakistan"],
    BD: ["Bangladesh"],
    NP: ["Nepal"],
    IL: ["Israel"],
    PS: ["Palestine"],
    KE: ["Kenya"],
    NG: ["Nigeria"],
    ET: ["Ethiopia"],
    GH: ["Ghana"],
    MA: ["Morocco"],
    TZ: ["Tanzania"],
    UG: ["Uganda"],
    UA: ["Ukraine"],
    PL: ["Poland"],
    GR: ["Greece"],
    IE: ["Ireland", "Eire", "Republic of Ireland"],
    ES: ["Spain"],
    PT: ["Portugal"],
    IT: ["Italy"],
    FR: ["France"],
    DE: ["Germany"],
    BE: ["Belgium"],
    AT: ["Austria"],
    SE: ["Sweden"],
    NO: ["Norway"],
    DK: ["Denmark"],
    FI: ["Finland"],
    ID: ["Indonesia"],
    PH: ["Philippines"],
    TH: ["Thailand"],
    MY: ["Malaysia"],
    SG: ["Singapore"],
    JP: ["Japan"],
    KH: ["Cambodia"],
    LA: ["Laos"],
    MM: ["Myanmar", "Burma"],
    BN: ["Brunei"],
    MV: ["Maldives"],
    AF: ["Afghanistan"],
    IQ: ["Iraq"],
    SY: ["Syria"],
    JO: ["Jordan"],
    LB: ["Lebanon"],
    YE: ["Yemen"],
    OM: ["Oman"],
    QA: ["Qatar"],
    KW: ["Kuwait"],
    BH: ["Bahrain"],
    BY: ["Belarus"],
    RS: ["Serbia"],
    HR: ["Croatia"],
    SK: ["Slovakia"],
    SI: ["Slovenia"],
    BA: ["Bosnia", "Bosnia and Herzegovina"],
    MK: ["North Macedonia", "Macedonia"],
    HU: ["Hungary"],
    RO: ["Romania"],
    BG: ["Bulgaria"],
    LT: ["Lithuania"],
    LV: ["Latvia"],
    EE: ["Estonia"],
    IS: ["Iceland"],
    LU: ["Luxembourg"],
    MT: ["Malta"],
    CY: ["Cyprus"],
    GE: ["Georgia"],
    AM: ["Armenia"],
    AZ: ["Azerbaijan"],
    KZ: ["Kazakhstan"],
    UZ: ["Uzbekistan"],
    MN: ["Mongolia"],
    NP: ["Nepal"],
    BT: ["Bhutan"],
    LK: ["Sri Lanka", "Ceylon"],
    AR: ["Argentina"],
    UY: ["Uruguay"],
    PY: ["Paraguay"],
    BO: ["Bolivia"],
    EC: ["Ecuador"],
    CR: ["Costa Rica"],
    PA: ["Panama"],
    GT: ["Guatemala"],
    CU: ["Cuba"],
    DO: ["Dominican Republic"],
    PR: ["Puerto Rico"],
    JM: ["Jamaica"],
    TT: ["Trinidad and Tobago"],
    NZ: ["New Zealand"],
    FJ: ["Fiji"],
    PG: ["Papua New Guinea"],
    VC: [
      "Saint Vincent and the Grenadines",
      "St Vincent",
      "St. Vincent",
      "St Vincent and the Grenadines",
      "St. Vincent and the Grenadines",
      "St. Vincent & Grenadines",
    ],
    LC: ["Saint Lucia", "St Lucia", "St. Lucia"],
    KN: [
      "Saint Kitts and Nevis",
      "St Kitts and Nevis",
      "St. Kitts and Nevis",
      "St Kitts",
      "Saint Kitts",
      "St. Kitts & Nevis",
    ],
    TL: ["Timor-Leste", "East Timor", "Timor Leste"],
    SZ: ["Eswatini", "Swaziland"],
    CV: ["Cape Verde", "Cabo Verde"],
    CI: ["Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire", "Côte d’Ivoire"],
    TR: ["Turkey", "Turkiye", "Türkiye"],
    VA: ["Vatican", "Vatican City", "Holy See"],
    SM: ["San Marino"],
    AX: ["Aland", "Aland Islands", "Åland", "Åland Islands"],
    SJ: ["Svalbard", "Svalbard and Jan Mayen", "Svalbard & Jan Mayen", "Jan Mayen"],
    AG: ["Antigua and Barbuda", "Antigua & Barbuda"],
    ST: ["Sao Tome and Principe", "São Tomé and Príncipe", "Sao Tome"],
    FM: ["Micronesia", "Federated States of Micronesia"],
    CD: ["DR Congo", "DRC", "Democratic Republic of the Congo", "Congo-Kinshasa"],
    CG: ["Congo-Brazzaville", "Republic of the Congo"],
    SH: ["Saint Helena", "St Helena", "St. Helena", "Saint Helena, Ascension and Tristan da Cunha"],
    PM: ["Saint Pierre and Miquelon", "St Pierre and Miquelon", "St. Pierre and Miquelon", "St. Pierre & Miquelon"],
    BL: ["Saint Barthelemy", "St Barthelemy", "St. Barthélemy", "Saint Barthélemy"],
    MF: ["Saint Martin", "St Martin", "St. Martin"],
    SX: ["Sint Maarten", "Saint Martin (Dutch)"],
  };

  const ABBREVIATIONS = {
    EST: ["America/New_York"],
    EDT: ["America/New_York"],
    ET: ["America/New_York"],
    CST: ["America/Chicago", "Asia/Shanghai"],
    CDT: ["America/Chicago"],
    CT: ["America/Chicago"],
    MST: ["America/Denver", "America/Phoenix"],
    MDT: ["America/Denver"],
    MT: ["America/Denver"],
    PST: ["America/Los_Angeles"],
    PDT: ["America/Los_Angeles"],
    PT: ["America/Los_Angeles"],
    AKST: ["America/Anchorage"],
    AKDT: ["America/Anchorage"],
    AKT: ["America/Anchorage"],
    HST: ["Pacific/Honolulu"],
    GMT: ["Etc/GMT", "UTC", "Europe/London", "Atlantic/Reykjavik"],
    UTC: ["UTC", "Etc/UTC"],
    BST: ["Europe/London"],
    IST: ["Asia/Kolkata", "Asia/Jerusalem", "Europe/Dublin"],
    CET: ["Europe/Paris", "Europe/Berlin"],
    CEST: ["Europe/Paris", "Europe/Berlin"],
    EET: ["Europe/Athens", "Europe/Bucharest", "Europe/Helsinki"],
    EEST: ["Europe/Athens", "Europe/Bucharest", "Europe/Helsinki"],
    WET: ["Europe/Lisbon"],
    WEST: ["Europe/Lisbon"],
    JST: ["Asia/Tokyo"],
    KST: ["Asia/Seoul"],
    SGT: ["Asia/Singapore"],
    HKT: ["Asia/Hong_Kong"],
    AEST: ["Australia/Sydney"],
    AEDT: ["Australia/Sydney"],
    AET: ["Australia/Sydney"],
    ACST: ["Australia/Adelaide"],
    ACDT: ["Australia/Adelaide"],
    AWST: ["Australia/Perth"],
    NZST: ["Pacific/Auckland"],
    NZDT: ["Pacific/Auckland"],
    NZT: ["Pacific/Auckland"],
    GST: ["Asia/Dubai"],
    PKT: ["Asia/Karachi"],
    NPT: ["Asia/Kathmandu"],
    SLST: ["Asia/Colombo"],
    BDT: ["Asia/Dhaka"],
    MSK: ["Europe/Moscow"],
    TRT: ["Europe/Istanbul"],
    WAT: ["Africa/Lagos"],
    CAT: ["Africa/Maputo"],
    EAT: ["Africa/Nairobi"],
    SAST: ["Africa/Johannesburg"],
    NST: ["America/St_Johns"],
    NDT: ["America/St_Johns"],
    AST: ["America/Halifax", "America/Puerto_Rico", "Asia/Riyadh"],
    ADT: ["America/Halifax"],
    ART: ["America/Argentina/Buenos_Aires"],
    BRT: ["America/Sao_Paulo"],
    CLT: ["America/Santiago"],
    PET: ["America/Lima"],
    COT: ["America/Bogota"],
    PHT: ["Asia/Manila"],
    ICT: ["Asia/Bangkok"],
    MYT: ["Asia/Kuala_Lumpur"],
    WIB: ["Asia/Jakarta"],
    IDT: ["Asia/Jerusalem"],
    IRST: ["Asia/Tehran"],
  };

  const ABBREV_NOTES = {
    IST: "IST (also used in Israel and Ireland)",
    CST: "CST",
  };

  const CURATED_ZONE_LABELS = {
    "Asia/Colombo": "Sri Lanka Standard Time",
    "Asia/Kolkata": "India Standard Time",
    "Asia/Calcutta": "India Standard Time",
  };

  const EXTRA_LONG_NAMES = {
    "Asia/Kolkata": ["Indian Standard Time", "India Standard Time", "India Time"],
    "Asia/Calcutta": ["Indian Standard Time", "India Standard Time", "India Time"],
    "Asia/Colombo": ["Sri Lanka Standard Time", "Sri Lanka Time"],
  };

  const CITY_ALIASES = {
    "Asia/Kolkata": [
      "Delhi", "New Delhi", "Mumbai", "Bombay", "Bangalore", "Bengaluru", "Chennai",
      "Madras", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Surat",
      "Kanpur", "Nagpur", "Indore", "Bhopal", "Patna", "Chandigarh", "Kochi",
      "Cochin", "Thiruvananthapuram", "Trivandrum", "Visakhapatnam", "Vadodara",
      "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi",
      "Srinagar", "Amritsar", "Gurgaon", "Gurugram", "Noida", "Ghaziabad",
      "Mysore", "Mysuru", "Coimbatore", "Madurai", "Ranchi", "Bhubaneswar",
      "Guwahati", "Dehradun", "Navi Mumbai", "Thane", "Howrah", "Jodhpur",
      "Raipur", "Allahabad", "Prayagraj", "Vijayawada", "Tiruchirappalli",
    ],
    "Asia/Shanghai": [
      "Beijing", "Peking", "Guangzhou", "Shenzhen", "Chengdu", "Chongqing",
      "Wuhan", "Hangzhou", "Nanjing", "Tianjin", "Suzhou", "Dongguan",
      "Qingdao", "Dalian", "Xi'an", "Xian", "Ningbo", "Foshan", "Hefei",
      "Changsha", "Zhengzhou", "Shenyang", "Harbin", "Fuzhou", "Xiamen",
      "Jinan", "Kunming", "Nanning",
    ],
    "America/New_York": [
      "Boston", "Washington", "Washington DC", "DC", "Philadelphia", "Miami",
      "Atlanta", "Detroit", "Baltimore", "Charlotte", "Orlando", "Tampa",
      "Pittsburgh", "Cleveland", "Cincinnati", "Buffalo", "Newark", "Raleigh",
      "Richmond", "Jacksonville", "Columbus", "Brooklyn", "Manhattan", "NYC",
      "Philadelphia", "Hartford", "Providence", "Albany", "Rochester",
      "Syracuse", "Savannah", "Charleston", "Knoxville", "Virginia Beach",
    ],
    "America/Chicago": [
      "Dallas", "Houston", "Austin", "San Antonio", "Minneapolis", "St Louis",
      "Saint Louis", "Kansas City", "Milwaukee", "New Orleans", "Nashville",
      "Memphis", "Oklahoma City", "Omaha", "Tulsa", "Wichita", "St Paul",
      "Fort Worth", "Arlington", "Madison", "Des Moines", "Little Rock",
      "Baton Rouge", "Birmingham", "Jackson",
    ],
    "America/Denver": [
      "Salt Lake City", "Albuquerque", "Colorado Springs", "Boise",
      "Fort Collins", "Boulder", "Santa Fe", "Billings",
    ],
    "America/Phoenix": ["Phoenix", "Tucson", "Scottsdale", "Mesa", "Tempe"],
    "America/Los_Angeles": [
      "San Francisco", "SF", "Seattle", "Portland", "San Diego", "Sacramento",
      "San Jose", "Oakland", "Las Vegas", "Fresno", "Long Beach", "Anaheim",
      "Irvine", "Santa Monica", "Palo Alto", "Berkeley", "Spokane", "Tacoma",
      "Reno",
    ],
    "America/Anchorage": ["Anchorage", "Fairbanks", "Juneau"],
    "Pacific/Honolulu": ["Honolulu", "Maui", "Hawaii"],
    "America/Toronto": ["Montreal", "Ottawa", "Quebec", "Quebec City"],
    "America/Vancouver": ["Victoria"],
    "America/Edmonton": ["Calgary"],
    "Asia/Tokyo": ["Osaka", "Kyoto", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kawasaki", "Hiroshima", "Sendai"],
    "Asia/Seoul": ["Busan", "Pusan", "Incheon", "Daegu"],
    "Australia/Sydney": ["Canberra", "Newcastle"],
    "Australia/Melbourne": ["Melbourne"],
    "Australia/Brisbane": ["Gold Coast"],
    "Asia/Dubai": ["Abu Dhabi", "Sharjah", "Ajman"],
    "Asia/Riyadh": ["Jeddah", "Mecca", "Makkah", "Medina", "Dammam"],
    "Asia/Qatar": ["Doha"],
    "Asia/Kuwait": ["Kuwait City"],
    "Asia/Bahrain": ["Manama"],
    "Asia/Muscat": ["Muscat"],
    "Europe/Berlin": ["Frankfurt", "Munich", "Hamburg", "Cologne", "Koln", "Köln", "Dusseldorf", "Stuttgart"],
    "Europe/Madrid": ["Barcelona", "Valencia", "Seville"],
    "Europe/Rome": ["Milan", "Naples", "Turin", "Florence"],
    "Europe/Paris": ["Lyon", "Marseille", "Toulouse", "Nice"],
    "Europe/London": [
      "Birmingham", "Manchester", "Edinburgh", "Glasgow", "Liverpool",
      "Leeds", "Bristol", "Cardiff", "Belfast",
    ],
    "Europe/Amsterdam": ["Rotterdam", "The Hague"],
    "Europe/Zurich": ["Geneva", "Basel", "Bern"],
    "Europe/Brussels": ["Antwerp"],
    "Europe/Lisbon": ["Porto"],
    "Europe/Warsaw": ["Krakow", "Gdansk"],
    "Europe/Vienna": ["Salzburg"],
    "Europe/Stockholm": ["Gothenburg"],
    "Europe/Oslo": ["Bergen"],
    "Asia/Ho_Chi_Minh": ["Ho Chi Minh City", "Saigon", "Hanoi"],
    "Asia/Phnom_Penh": ["Phnom Penh"],
    "Asia/Yangon": ["Yangon", "Rangoon"],
    "Asia/Jakarta": ["Bandung", "Surabaya"],
    "Asia/Manila": ["Cebu"],
    "Asia/Kuala_Lumpur": ["George Town", "Johor Bahru", "Penang"],
    "Asia/Karachi": ["Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
    "Asia/Dhaka": ["Chittagong"],
    "Asia/Kathmandu": ["Kathmandu", "Pokhara"],
    "Asia/Colombo": ["Colombo"],
    "Africa/Johannesburg": ["Cape Town", "Durban", "Pretoria"],
    "Africa/Accra": ["Accra"],
    "Africa/Addis_Ababa": ["Addis Ababa"],
    "Africa/Casablanca": ["Casablanca"],
    "Africa/Tunis": ["Tunis"],
    "Africa/Algiers": ["Algiers"],
    "Africa/Kampala": ["Kampala"],
    "Africa/Dar_es_Salaam": ["Dar es Salaam"],
    "Africa/Nairobi": ["Nairobi"],
    "Africa/Lagos": ["Lagos"],
    "Africa/Cairo": ["Cairo"],
    "America/Sao_Paulo": ["Rio de Janeiro", "Brasilia", "Salvador", "Belo Horizonte", "Recife", "Porto Alegre"],
    "America/Mexico_City": ["Guadalajara", "Monterrey", "Puebla", "Mexico City"],
    "America/Bogota": ["Medellin", "Cali", "Bogota", "Bogotá"],
    "America/Guayaquil": ["Quito", "Guayaquil"],
    "America/Argentina/Buenos_Aires": ["Buenos Aires"],
    "America/Lima": ["Lima"],
    "America/Santiago": ["Santiago"],
    "America/Montevideo": ["Montevideo"],
    "America/Caracas": ["Caracas"],
    "America/Panama": ["Panama City"],
    "America/Puerto_Rico": ["San Juan"],
    "America/Havana": ["Havana"],
    "America/Costa_Rica": ["San Jose"],
    "America/Guatemala": ["Guatemala City"],
    "Asia/Jerusalem": ["Tel Aviv", "Jerusalem"],
    "Asia/Beirut": ["Beirut"],
    "Asia/Amman": ["Amman"],
    "Asia/Baghdad": ["Baghdad"],
    "Asia/Tehran": ["Tehran"],
    "Europe/Istanbul": ["Istanbul"],
    "Europe/Moscow": ["Moscow"],
    "Pacific/Auckland": ["Wellington", "Christchurch", "Auckland"],
  };

  const ZONE_PRIORITY = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Kolkata",
    "Asia/Calcutta",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Dubai",
    "Australia/Sydney",
    "Pacific/Auckland",
    "America/Toronto",
    "America/Sao_Paulo",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Colombo",
    "Europe/Amsterdam",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Zurich",
    "Europe/Athens",
    "Europe/Moscow",
    "Europe/Istanbul",
    "Europe/Dublin",
    "Asia/Jerusalem",
    "UTC",
    "Etc/UTC",
  ];

  const SEARCH_LIMIT = 12;

  let cachedSearchIndex = null;

  function normalizeSearch(value) {
    let s = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’'`´]/g, "")
      .replace(/&/g, " and ");
    // Expand "St" / "St." to "Saint", but leave two-letter codes such as ST (São Tomé) alone.
    const trimmed = s.trim();
    if (!/^[a-z]{2}$/.test(trimmed)) {
      s = s.replace(/\bst\.?\b/g, "saint ");
    }
    return s.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }

  const SEARCH_STOPWORDS = { and: true, the: true, of: true };

  function searchTokens(value) {
    const n = normalizeSearch(value);
    const words = n ? n.split(" ") : [];
    const meaningful = words.filter(function (w) { return !SEARCH_STOPWORDS[w]; });
    return meaningful.length ? meaningful : words;
  }

  function uniqueStrings(values) {
    const out = [];
    const seen = {};
    for (let i = 0; i < values.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      const key = normalizeSearch(raw);
      if (!key || seen[key]) continue;
      seen[key] = true;
      out.push(String(raw));
    }
    return out;
  }

  function zonePriority(timeZone) {
    const resolved = resolveZone(timeZone);
    const preferred = preferredZone(timeZone);
    let best = 5000;
    for (let i = 0; i < ZONE_PRIORITY.length; i++) {
      if (sameZone(ZONE_PRIORITY[i], resolved) || ZONE_PRIORITY[i] === timeZone || ZONE_PRIORITY[i] === preferred) {
        if (i < best) best = i;
      }
    }
    return best;
  }

  function acceptedTimeZone(timeZone) {
    if (!timeZone) return false;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timeZone }).format(new Date(0));
      return true;
    } catch (err) {
      return false;
    }
  }

  function usableZoneName(timeZone) {
    try {
      const preferred = preferredZone(timeZone);
      if (preferred && acceptedTimeZone(preferred)) return preferred;
      if (acceptedTimeZone(timeZone)) return timeZone;
      const resolved = resolveZone(timeZone);
      if (resolved && acceptedTimeZone(resolved)) return resolved;
    } catch (err) {
      // unknown zone
    }
    return "";
  }

  function uniqueSearchZones() {
    const raw = listTimeZones();
    const out = [];
    const seen = {};
    function addZoneId(timeZone) {
      const usable = usableZoneName(timeZone);
      if (!usable || seen[usable]) return;
      seen[usable] = true;
      out.push(usable);
    }
    for (let i = 0; i < raw.length; i++) {
      addZoneId(resolveZone(raw[i]));
    }
    if (!out.some(function (z) { return z === "UTC" || z === "Etc/UTC"; })) {
      addZoneId("UTC");
    }
    // Include zone.tab / backward alias zones whose country would otherwise
    // be missing because the zone is only a link (e.g. America/St_Vincent).
    const covered = {};
    for (let i = 0; i < out.length; i++) {
      const code = countryCodeForZone(out[i]);
      if (code) covered[code] = true;
    }
    Object.keys(ZONE_COUNTRIES).forEach(function (zone) {
      if (!/^[A-Za-z0-9_/+-]+$/.test(zone)) return;
      const code = ZONE_COUNTRIES[zone];
      if (!code || covered[code]) return;
      const name = acceptedTimeZone(zone) ? zone : usableZoneName(zone);
      if (!name) return;
      if (!seen[name]) {
        seen[name] = true;
        out.push(name);
      }
      covered[code] = true;
    });
    return out;
  }

  function intlNameAt(timeZone, instant, style) {
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: timeZone,
        timeZoneName: style,
        hour: "numeric",
      }).formatToParts(new Date(instant));
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") return parts[i].value;
      }
    } catch (err) {
      return "";
    }
    return "";
  }

  function harvestIntlNames(timeZone) {
    const instants = [Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 6, 15, 12)];
    const styles = ["long", "longGeneric", "shortGeneric", "short"];
    const longs = [];
    const shorts = [];
    for (let i = 0; i < instants.length; i++) {
      for (let s = 0; s < styles.length; s++) {
        const value = intlNameAt(timeZone, instants[i], styles[s]);
        if (!value) continue;
        if (isOffsetStyleName(value)) continue;
        if (styles[s] === "short") shorts.push(value);
        else longs.push(value);
      }
    }
    const uniqueLongs = uniqueStrings(longs);
    uniqueLongs.slice().forEach(function (name) {
      const generic = name
        .replace(/ Standard Time$/i, " Time")
        .replace(/ Daylight Time$/i, " Time")
        .replace(/ Summer Time$/i, " Time");
      if (generic !== name) uniqueLongs.push(generic);
    });
    return { longs: uniqueStrings(uniqueLongs), shorts: uniqueStrings(shorts) };
  }

  function ianaCityName(timeZone) {
    if (!timeZone || timeZone === "UTC" || timeZone.indexOf("/") === -1) {
      return timeZone === "UTC" || timeZone === "Etc/UTC" ? "UTC" : (timeZone || "");
    }
    return timeZone.split("/").pop().replace(/_/g, " ");
  }

  function countryAliasList(code) {
    const names = [];
    if (code) {
      names.push(countryDisplayName(code), code);
      const extra = COUNTRY_ALIASES[code];
      if (extra) {
        for (let i = 0; i < extra.length; i++) names.push(extra[i]);
      }
    }
    return uniqueStrings(names);
  }

  function buildSearchIndex() {
    if (cachedSearchIndex) return cachedSearchIndex;
    const zones = uniqueSearchZones();
    const countryCounts = {};
    const entries = [];

    for (let i = 0; i < zones.length; i++) {
      const timeZone = zones[i];
      const code = countryCodeForZone(timeZone);
      if (code) countryCounts[code] = (countryCounts[code] || 0) + 1;
    }
    // Treat legacy aliases of the same zone as one country zone.
    // uniqueSearchZones already deduped, so counts are unique zones.

    for (let i = 0; i < zones.length; i++) {
      const timeZone = zones[i];
      const code = countryCodeForZone(timeZone);
      const country = code ? countryDisplayName(code) : "";
      const city = ianaCityName(timeZone);
      const harvested = harvestIntlNames(timeZone);
      const curatedLabel = CURATED_ZONE_LABELS[timeZone] || CURATED_ZONE_LABELS[preferredZone(timeZone)] || "";
      const extraLong = EXTRA_LONG_NAMES[timeZone] || EXTRA_LONG_NAMES[preferredZone(timeZone)] || [];
      const countryName = country;
      const longNames = uniqueStrings(
        harvested.longs.concat(extraLong).concat(curatedLabel ? [curatedLabel] : []).filter(function (n) {
          const nn = normalizeSearch(n);
          const cn = normalizeSearch(countryName);
          if (!cn) return true;
          if (nn.indexOf(cn) !== -1) return true;
          // Drop another country's standard name, e.g. "India Standard Time" on Colombo.
          if (/^(india|indian)( standard)? time$/.test(nn) && cn !== "india") return false;
          return true;
        })
      );
      const cities = uniqueStrings(
        [city, shortName(timeZone)].concat(CITY_ALIASES[timeZone] || [], CITY_ALIASES[preferredZone(timeZone)] || [])
      );
      const countryNames = countryAliasList(code);
      const abbrevs = [];
      Object.keys(ABBREVIATIONS).forEach(function (abbr) {
        const list = ABBREVIATIONS[abbr];
        for (let a = 0; a < list.length; a++) {
          if (sameZone(list[a], timeZone)) {
            abbrevs.push(abbr);
            break;
          }
        }
      });
      harvested.shorts.forEach(function (s) { abbrevs.push(s); });

      const generic = (function () {
        function isWeakCountryLabel(n) {
          if (!country) return false;
          const nn = normalizeSearch(n);
          const cn = normalizeSearch(country);
          return nn === cn + " time" || nn === cn + " standard time";
        }
        if (curatedLabel) return curatedLabel;
        const strong = longNames.filter(function (n) { return !isWeakCountryLabel(n); });
        const genericLike = strong.filter(function (n) {
          return / Time$/i.test(n) && !/ (Standard|Daylight|Summer) Time$/i.test(n);
        });
        if (genericLike.length) return genericLike[0];
        if (strong.length) return strong[0];
        return longNames[0] || "";
      })();

      const multi = !!(code && countryCounts[code] > 1);
      let title;
      if (country && multi && generic) {
        title = country + " · " + generic + " (" + city + ")";
      } else if (country && (curatedLabel || generic)) {
        title = country + " · " + (curatedLabel || generic);
      } else if (generic) {
        title = generic;
      } else {
        title = friendlyName(timeZone);
      }

      const terms = uniqueStrings(
        longNames.concat(cities, countryNames, abbrevs, [timeZone.replace(/_/g, " "), title, curatedLabel])
          .concat(aliasesFor(timeZone))
      );

      entries.push({
        timeZone: timeZone,
        city: city,
        countryCode: code || "",
        country: country,
        title: title,
        generic: generic,
        longNames: longNames,
        cities: cities,
        countryNames: countryNames,
        abbrevs: uniqueStrings(abbrevs),
        terms: terms,
        termNorms: terms.map(normalizeSearch),
        titleNorm: normalizeSearch(title),
        priority: zonePriority(timeZone),
        multi: multi,
      });
    }

    cachedSearchIndex = entries;
    return entries;
  }

  function isAbbrevQuery(queryNorm) {
    if (!queryNorm || queryNorm.indexOf(" ") !== -1) return false;
    return !!ABBREVIATIONS[queryNorm.toUpperCase()];
  }

  function hasWholeWord(field, needle) {
    const words = field.split(" ");
    for (let i = 0; i < words.length; i++) {
      if (words[i] === needle) return true;
    }
    return false;
  }

  function bestFieldScore(entry, queryNorm, queryWords) {
    let best = 99;
    let matched = "";
    const terms = entry.terms;
    const norms = entry.termNorms;
    const abbrevOnly = isAbbrevQuery(queryNorm);
    for (let i = 0; i < norms.length; i++) {
      const field = norms[i];
      if (!field) continue;
      let score = -1;
      if (abbrevOnly) {
        if (field === queryNorm) score = 0;
      } else if (field === queryNorm) {
        score = 0;
      } else if (queryNorm.length >= 3 && (field === queryNorm || field.indexOf(queryNorm + " ") === 0 || field.indexOf(queryNorm) === 0)) {
        score = 1;
      } else {
        const words = field.split(" ");
        const allWordPrefix = queryWords.every(function (qw) {
          return words.some(function (w) { return w === qw || (qw.length >= 3 && w.indexOf(qw) === 0); });
        });
        if (allWordPrefix && queryWords.length) {
          const allExactWords = queryWords.every(function (qw) { return words.indexOf(qw) !== -1; });
          score = allExactWords && queryWords.length > 1 ? 1 : 2;
        } else if (queryNorm.length >= 4 && hasWholeWord(field, queryNorm)) {
          score = 3;
        } else if (queryNorm.length >= 4 && queryWords.every(function (qw) { return hasWholeWord(field, qw); })) {
          score = 4;
        }
      }
      if (score >= 0 && score < best) {
        best = score;
        matched = terms[i];
        if (best === 0) break;
      }
    }
    if (best === 99) return null;
    return { score: best, matched: matched };
  }

  function abbreviationBoost(entry, queryNorm) {
    const q = queryNorm.toUpperCase().replace(/\s+/g, "");
    if (!q) return 0;
    for (let i = 0; i < entry.abbrevs.length; i++) {
      if (normalizeSearch(entry.abbrevs[i]).replace(/\s+/g, "") === queryNorm) {
        const canon = ABBREVIATIONS[entry.abbrevs[i].toUpperCase()] || ABBREVIATIONS[q];
        if (canon) {
          for (let c = 0; c < canon.length; c++) {
            if (sameZone(canon[c], entry.timeZone)) return c;
          }
        }
        return 10;
      }
    }
    return 20;
  }

  function matchNote(entry, matched, queryNorm) {
    if (!matched) return "";
    const q = queryNorm.toUpperCase().replace(/\s+/g, "");
    if (q === "IST" && sameZone(entry.timeZone, "Asia/Kolkata")) {
      return "matches: IST (also used in Israel and Ireland)";
    }
    if (q === "CST" && sameZone(entry.timeZone, "Asia/Shanghai")) {
      return "matches: CST (China Standard Time)";
    }
    if (q === "CST" && sameZone(entry.timeZone, "America/Chicago")) {
      return "matches: CST (Central Standard Time)";
    }
    const titleNorm = entry.titleNorm;
    const matchedNorm = normalizeSearch(matched);
    if (!matchedNorm) return "";
    if (titleNorm === matchedNorm || titleNorm.indexOf(matchedNorm) !== -1) return "";
    for (let i = 0; i < entry.countryNames.length; i++) {
      if (normalizeSearch(entry.countryNames[i]) === matchedNorm) return "";
    }
    return "matches: " + matched;
  }

  function fieldMatchesQuery(fieldNorm, queryNorm, queryWords) {
    if (!fieldNorm || !queryNorm) return false;
    if (fieldNorm === queryNorm) return true;
    if (fieldNorm.indexOf(queryNorm + " ") === 0 || fieldNorm.indexOf(queryNorm) === 0) return true;
    const words = fieldNorm.split(" ");
    return queryWords.length > 0 && queryWords.every(function (qw) {
      return words.some(function (w) { return w === qw || (qw.length >= 3 && w.indexOf(qw) === 0); });
    });
  }

  function isShortCountryToken(name) {
    const n = normalizeSearch(name);
    if (!n) return true;
    if (n.length <= 3 && n.indexOf(" ") === -1) return true;
    return n === "usa" || n === "u s a" || n === "u s" || n === "u k" || n === "uk" || n === "uae" || n === "u a e" || n === "drc" || n === "rok" || n === "dprk" || n === "prc" || n === "ksa";
  }

  function pickDisplayLabel(entry, query, queryNorm, queryWords) {
    const qn = queryNorm || normalizeSearch(query);
    const qw = queryWords || searchTokens(query);
    if (qn) {
      for (let i = 0; i < (entry.cities || []).length; i++) {
        const city = entry.cities[i];
        if (fieldMatchesQuery(normalizeSearch(city), qn, qw)) {
          return { displayLabel: city, labelKind: "city" };
        }
      }
      let countryHit = "";
      for (let i = 0; i < (entry.countryNames || []).length; i++) {
        const name = entry.countryNames[i];
        if (fieldMatchesQuery(normalizeSearch(name), qn, qw)) {
          if (normalizeSearch(name) === qn && !isShortCountryToken(name)) {
            return { displayLabel: name, labelKind: "country" };
          }
          if (!countryHit) countryHit = name;
        }
      }
      if (countryHit) {
        const nice = (entry.country && !isShortCountryToken(entry.country)) ? entry.country : countryHit;
        const exactLong = (entry.countryNames || []).find(function (name) {
          return normalizeSearch(name) === qn && !isShortCountryToken(name);
        });
        return { displayLabel: exactLong || nice || countryHit, labelKind: "country" };
      }
    }
    return { displayLabel: shortName(entry.timeZone), labelKind: "zone" };
  }

  function searchTimeZones(query, zones) {

    const list = zones || null;
    const q = String(query || "").trim();
    const index = buildSearchIndex();
    let pool = index;
    if (list && list.length) {
      pool = index.filter(function (entry) {
        return list.some(function (z) { return sameZone(z, entry.timeZone); });
      });
    }

    if (!q) {
      return pool.slice().sort(function (a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.title.localeCompare(b.title);
      }).slice(0, SEARCH_LIMIT).map(function (entry) {
        return {
          timeZone: entry.timeZone,
          name: entry.title,
          title: entry.title,
          short: shortName(entry.timeZone),
          displayLabel: shortName(entry.timeZone),
          labelKind: "zone",
          matchLabel: "",
          score: 0,
        };
      });
    }

    const queryNorm = normalizeSearch(q);
    const queryWords = searchTokens(q);
    if (!queryNorm) return [];

    const scored = [];
    for (let i = 0; i < pool.length; i++) {
      const entry = pool[i];
      const hit = bestFieldScore(entry, queryNorm, queryWords);
      if (!hit) continue;
      const picked = pickDisplayLabel(entry, q, queryNorm, queryWords);
      scored.push({
        timeZone: entry.timeZone,
        name: entry.title,
        title: entry.title,
        short: shortName(entry.timeZone),
        displayLabel: picked.displayLabel,
        labelKind: picked.labelKind,
        matchLabel: matchNote(entry, hit.matched, queryNorm),
        score: hit.score,
        priority: entry.priority,
        abbrevBoost: abbreviationBoost(entry, queryNorm),
      });
    }

    scored.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      if (a.abbrevBoost !== b.abbrevBoost) return a.abbrevBoost - b.abbrevBoost;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.title.localeCompare(b.title);
    });
    return scored.slice(0, SEARCH_LIMIT);
  }


  function formatTime(wall, hour12) {
    const min = pad2(wall.minute);
    const sec = pad2(wall.second == null ? 0 : wall.second);
    if (!hour12) {
      return pad2(wall.hour) + ":" + min + ":" + sec;
    }
    const hour24 = wall.hour;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    let h = hour24 % 12;
    if (h === 0) h = 12;
    return h + ":" + min + ":" + sec + " " + suffix;
  }

  function formatTimeShort(wall, hour12) {
    const min = pad2(wall.minute);
    if (!hour12) return pad2(wall.hour) + ":" + min;
    const hour24 = wall.hour;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    let h = hour24 % 12;
    if (h === 0) h = 12;
    return h + ":" + min + " " + suffix;
  }

  function formatDate(wall) {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return (wall.weekday ? wall.weekday + ", " : "") +
      months[wall.month - 1] + " " + wall.day + ", " + wall.year;
  }

  function isoDate(wallOrParts) {
    return wallOrParts.year + "-" + pad2(wallOrParts.month) + "-" + pad2(wallOrParts.day);
  }

  function parseIsoDate(value) {
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function parseIsoTime(value) {
    const m = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]), second: Number(m[3] || 0) };
  }

  function detectTimeZone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    } catch (err) {
      // ignore
    }
    return "UTC";
  }

  function encodeLabelPart(label) {
    return encodeURIComponent(String(label)).replace(/[!'()*]/g, function (c) {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  function decodeLabelPart(part) {
    try {
      return decodeURIComponent(String(part).replace(/\+/g, " "));
    } catch (err) {
      return String(part || "");
    }
  }

  function encodeZoneEntry(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    const tz = item.tz || item.timeZone;
    if (!tz) return "";
    const label = item.label;
    if (!label || label === shortName(tz)) return tz;
    return tz + ":" + encodeLabelPart(label);
  }

  function encodeZoneList(list) {
    if (!list || !list.length) return "";
    return list.map(encodeZoneEntry).filter(Boolean).join(",");
  }

  function parseZoneEntry(token) {
    const s = String(token || "").trim();
    if (!s) return null;
    const colon = s.indexOf(":");
    if (colon === -1) {
      return { tz: s, timeZone: s, label: shortName(s) };
    }
    const tz = s.slice(0, colon);
    const label = decodeLabelPart(s.slice(colon + 1)) || shortName(tz);
    return { tz: tz, timeZone: tz, label: label };
  }

  function encodeState(state) {
    const p = new URLSearchParams();
    const zones = encodeZoneList(state.zoneEntries || state.zones);
    if (zones) p.set("z", zones);
    if (state.from) {
      p.set("from", encodeZoneEntry({ tz: state.from, label: state.fromLabel }));
    }
    const to = encodeZoneList(state.toEntries || state.to);
    if (to) p.set("to", to);
    if (state.date) p.set("d", state.date);
    if (state.time) p.set("t", state.time);
    if (state.meetingDate) p.set("md", state.meetingDate);
    p.set("h", state.hour12 ? "12" : "24");
    if (state.workStart) p.set("ws", state.workStart);
    if (state.workEnd) p.set("we", state.workEnd);
    if (state.perCityHours) p.set("wh", "1");
    if (state.duration && Number(state.duration) !== DEFAULT_DURATION_MIN) p.set("dur", String(state.duration));
    const cityHours = state.cityHours || state.workHoursList;
    if (state.perCityHours && cityHours && cityHours.length) {
      p.set("w", cityHours.map(function (h) {
        const start = (h && (h.start || h.workStart)) || state.workStart || "09:00";
        const end = (h && (h.end || h.workEnd)) || state.workEnd || "18:00";
        return start + "-" + end;
      }).join(","));
    }
    return p.toString();
  }

  function decodeState(str) {
    const raw = String(str || "").replace(/^[#?]/, "");
    const p = new URLSearchParams(raw);
    function list(key) {
      const v = p.get(key);
      if (!v) return [];
      return v.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    const zoneEntries = list("z").map(parseZoneEntry).filter(Boolean);
    const toEntries = list("to").map(parseZoneEntry).filter(Boolean);
    const fromToken = p.get("from") || "";
    const fromEntry = fromToken ? parseZoneEntry(fromToken) : null;
    const hour = p.get("h");
    return {
      zones: zoneEntries.map(function (e) { return e.tz; }),
      zoneEntries: zoneEntries,
      from: fromEntry ? fromEntry.tz : "",
      fromLabel: fromEntry && fromEntry.label !== shortName(fromEntry.tz) ? fromEntry.label : (fromEntry ? fromEntry.label : ""),
      to: toEntries.map(function (e) { return e.tz; }),
      toEntries: toEntries,
      date: p.get("d") || "",
      time: p.get("t") || "",
      meetingDate: p.get("md") || "",
      hour12: hour === "12",
      workStart: p.get("ws") || "",
      workEnd: p.get("we") || "",
      perCityHours: p.get("wh") === "1",
      duration: parseDuration(p.get("dur")),
      cityHours: (p.get("w") || "").split(",").map(function (part) {
        const m = String(part || "").trim().match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
        if (!m) return null;
        return { start: m[1].length === 4 ? "0" + m[1] : m[1], end: m[2].length === 4 ? "0" + m[2] : m[2] };
      }).filter(Boolean),
    };
  }


  function countryCodeForZone(timeZone) {
    if (!timeZone) return null;
    if (ZONE_COUNTRIES[timeZone]) return ZONE_COUNTRIES[timeZone];
    try {
      const preferred = preferredZone(timeZone);
      if (ZONE_COUNTRIES[preferred]) return ZONE_COUNTRIES[preferred];
      const resolved = resolveZone(timeZone);
      if (ZONE_COUNTRIES[resolved]) return ZONE_COUNTRIES[resolved];
    } catch (err) {
      // unknown zone
    }
    return null;
  }

  function countryDisplayName(code) {
    if (!code) return "";
    try {
      if (typeof Intl.DisplayNames === "function") {
        const names = new Intl.DisplayNames(["en"], { type: "region" });
        const label = names.of(code);
        if (label) return label;
      }
    } catch (err) {
      // fall back to the code
    }
    return code;
  }

  function isOffsetStyleName(name) {
    if (!name) return true;
    return /^(GMT|UTC)([+-].*)?$/i.test(String(name).trim());
  }

  function timeZoneLongName(timeZone, instant) {
    const ms = instant == null ? Date.now() : toMs(instant);
    const date = new Date(ms);
    let name = "";
    try {
      const parts = new Intl.DateTimeFormat("en", {
        timeZone: timeZone,
        timeZoneName: "long",
        hour: "numeric",
      }).formatToParts(date);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") {
          name = parts[i].value;
          break;
        }
      }
    } catch (err) {
      name = "";
    }
    if (!isOffsetStyleName(name)) return name;
    try {
      return formatOffsetLabel(getOffsetMs(timeZone, date));
    } catch (err) {
      return name || "";
    }
  }

  function placeLabel(timeZone, instant) {
    if (!timeZone) return "";
    const tzName = timeZoneLongName(timeZone, instant);
    const code = countryCodeForZone(timeZone);
    const country = code ? countryDisplayName(code) : "";
    if (country && tzName) return country + " · " + tzName;
    if (tzName) return tzName;
    if (country) return country;
    return String(timeZone);
  }

  // ---------------------------------------------------------------------
  // Meeting length (Add to calendar)
  // ---------------------------------------------------------------------

  const DEFAULT_DURATION_MIN = 60;
  const DURATION_CHOICES = [15, 30, 45, 60, 90, 120];

  function parseDuration(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_DURATION_MIN;
    return DURATION_CHOICES.indexOf(n) !== -1 ? n : DEFAULT_DURATION_MIN;
  }

  // ---------------------------------------------------------------------
  // Weekends by country
  // ---------------------------------------------------------------------
  // Day numbers: 0 = Sunday … 6 = Saturday. Countries not listed use
  // Saturday–Sunday. Checked in November 2026 against Unicode CLDR week
  // data (the weekend table browsers ship in ICU) and Wikipedia's
  // "Workweek and weekend" article. Where they differ:
  //  - Bangladesh, Maldives and Palestine: Friday–Saturday (Wikipedia;
  //    CLDR lists Saturday–Sunday).
  //  - Djibouti and Somalia: Friday only; Brunei: Friday and Sunday;
  //    Nepal: Saturday only (Wikipedia; CLDR lists Saturday–Sunday).
  //  - India and Uganda: CLDR lists Sunday only (the legal minimum), but
  //    offices broadly close on Saturday too, so they keep the default.
  //  - UAE moved to Saturday–Sunday in 2022 and keeps the default.
  //  - Iran: Friday only. Parliament has voted on adding Thursday or
  //    Saturday, but no change had been enacted as of mid-2026.
  //  - Afghanistan: Thursday–Friday (CLDR, current practice).
  const FRI_SAT = [5, 6];
  const WEEKEND_BY_COUNTRY = {
    BD: FRI_SAT, BH: FRI_SAT, DZ: FRI_SAT, EG: FRI_SAT, IL: FRI_SAT,
    IQ: FRI_SAT, JO: FRI_SAT, KW: FRI_SAT, LY: FRI_SAT, MV: FRI_SAT,
    OM: FRI_SAT, PS: FRI_SAT, QA: FRI_SAT, SA: FRI_SAT, SD: FRI_SAT,
    SY: FRI_SAT, YE: FRI_SAT,
    AF: [4, 5],
    IR: [5],
    DJ: [5],
    SO: [5],
    BN: [5, 0],
    NP: [6],
  };
  const DEFAULT_WEEKEND = [6, 0];
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function weekdayIndex(wall) {
    return new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay();
  }

  function weekendDays(countryCode) {
    const code = String(countryCode || "").toUpperCase();
    return (WEEKEND_BY_COUNTRY[code] || DEFAULT_WEEKEND).slice();
  }

  function formatWeekendDays(days) {
    const names = days.map(function (d) { return WEEKDAY_SHORT[d]; });
    if (names.length === 1) return names[0];
    const consecutive = (days[0] + 1) % 7 === days[1];
    return names[0] + (consecutive ? "–" : " and ") + names[1];
  }

  // Is this wall date a weekend day in the zone's country?
  // Zones with no country (UTC, Etc/*) are never flagged.
  function weekendInfo(timeZone, wall) {
    const country = countryCodeForZone(timeZone);
    const day = weekdayIndex(wall);
    if (!country) {
      return { known: false, isWeekend: false, country: null, days: [], dayName: WEEKDAY_LONG[day], rule: "" };
    }
    const days = weekendDays(country);
    return {
      known: true,
      isWeekend: days.indexOf(day) !== -1,
      country: country,
      days: days,
      dayName: WEEKDAY_LONG[day],
      rule: formatWeekendDays(days),
    };
  }

  // ---------------------------------------------------------------------
  // Picking a time on the meeting bar
  // ---------------------------------------------------------------------

  // Snap an instant to the nearest step counted from origin (local midnight
  // of the bar's zone), so picks land on :00/:15/:30/:45 local time even on
  // DST days and in +5:45-style zones.
  function snapInstant(instant, origin, stepMin) {
    const step = Math.max(1, stepMin || 15) * MINUTE;
    return origin + Math.round((instant - origin) / step) * step;
  }

  function pickOnBar(dayStart, dayEnd, fraction, stepMin) {
    const step = Math.max(1, stepMin || 15);
    const f = Math.min(1, Math.max(0, Number(fraction) || 0));
    const raw = dayStart + f * (dayEnd - dayStart);
    const snapped = snapInstant(raw, dayStart, step);
    const last = dayEnd - step * MINUTE;
    return Math.min(last, Math.max(dayStart, snapped));
  }

  function instantFraction(instant, dayStart, dayEnd) {
    if (!(dayEnd > dayStart)) return null;
    if (instant < dayStart || instant >= dayEnd) return null;
    return (instant - dayStart) / (dayEnd - dayStart);
  }

  // ---------------------------------------------------------------------
  // Copy as text
  // ---------------------------------------------------------------------

  function formatShortDate(wall) {
    return WEEKDAY_SHORT[weekdayIndex(wall)] + " " + wall.day + " " + MONTH_SHORT[wall.month - 1];
  }

  // rows: [{ label, wall }]. The first row's date leads; any city on a
  // different date gets its own date in brackets.
  // "Tue 12 Nov, 3:00 PM London / 4:00 PM Paris / 8:30 PM Mumbai"
  function formatShareText(rows, hour12) {
    const list = (rows || []).filter(function (r) { return r && r.wall; });
    if (!list.length) return "";
    const firstDate = formatShortDate(list[0].wall);
    const bits = list.map(function (r) {
      let text = formatTimeShort(r.wall, hour12) + " " + r.label;
      const d = formatShortDate(r.wall);
      if (d !== firstDate) text += " (" + d + ")";
      return text;
    });
    return firstDate + ", " + bits.join(" / ");
  }

  // ---------------------------------------------------------------------
  // Countdown
  // ---------------------------------------------------------------------

  function formatSpan(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes));
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d) return d + "d" + (h ? " " + h + "h" : "");
    if (h) return h + "h" + (m ? " " + m + "m" : "");
    return m + "m";
  }

  function formatCountdown(targetMs, nowMs) {
    const diff = targetMs - nowMs;
    if (Math.abs(diff) < MINUTE) return { state: "now", text: "Starting now" };
    if (diff > 0) {
      return { state: "future", text: "Starts in " + formatSpan(Math.ceil(diff / MINUTE)) };
    }
    return { state: "past", text: "Started " + formatSpan(Math.floor(-diff / MINUTE)) + " ago" };
  }

  function formatScrubOffset(minutes) {
    const m = Math.round(Number(minutes) || 0);
    if (m === 0) return "Now";
    return (m > 0 ? "+" : "−") + formatSpan(Math.abs(m)) + (m > 0 ? " from now" : " ago");
  }

  // ---------------------------------------------------------------------
  // Day and night shading
  // ---------------------------------------------------------------------

  // Local hour → "day" (7–19), "twilight" (5–7 and 19–21) or "night".
  function daylightPhase(hour, minute) {
    const h = Number(hour) + (Number(minute) || 0) / 60;
    if (h >= 7 && h < 19) return "day";
    if ((h >= 5 && h < 7) || (h >= 19 && h < 21)) return "twilight";
    return "night";
  }

  // Merged runs of the same phase between two instants, in the zone's local
  // time (DST-aware: the offset is read at every step).
  function daylightSegments(timeZone, start, end, stepMin) {
    const step = Math.max(5, stepMin || 15) * MINUTE;
    const out = [];
    for (let t = start; t < end; t += step) {
      const local = new Date(t + getOffsetMs(timeZone, t));
      const phase = daylightPhase(local.getUTCHours(), local.getUTCMinutes());
      const segEnd = Math.min(end, t + step);
      const last = out[out.length - 1];
      if (last && last.phase === phase) last.end = segEnd;
      else out.push({ start: t, end: segEnd, phase: phase });
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Calendar file (.ics, RFC 5545) and Google Calendar link
  // ---------------------------------------------------------------------

  function icsDateUtc(ms) {
    const d = new Date(toMs(ms));
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + "Z";
  }

  function icsEscape(text) {
    return String(text == null ? "" : text)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  function utf8Length(ch) {
    const c = ch.codePointAt(0);
    if (c < 0x80) return 1;
    if (c < 0x800) return 2;
    if (c < 0x10000) return 3;
    return 4;
  }

  // Fold content lines longer than 75 octets (RFC 5545 §3.1).
  function icsFold(line) {
    const parts = [];
    let current = "";
    let bytes = 0;
    for (const ch of String(line)) {
      const n = utf8Length(ch);
      const limit = parts.length ? 74 : 75;
      if (bytes + n > limit) {
        parts.push(current);
        current = "";
        bytes = 0;
      }
      current += ch;
      bytes += n;
    }
    parts.push(current);
    return parts.join("\r\n ");
  }

  function buildIcs(opts) {
    const start = toMs(opts.start);
    const duration = Math.max(1, Number(opts.durationMin) || DEFAULT_DURATION_MIN);
    const end = start + duration * MINUTE;
    const stamp = opts.stamp != null ? toMs(opts.stamp) : Date.now();
    const uid = opts.uid || (icsDateUtc(start) + "-" + Math.abs(hashString(String(opts.title) + String(opts.description))) + "@somoclox");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//somoclox//Every clock one glance//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + icsDateUtc(stamp),
      "DTSTART:" + icsDateUtc(start),
      "DTEND:" + icsDateUtc(end),
      "SUMMARY:" + icsEscape(opts.title || "Meeting (somoclox)"),
    ];
    if (opts.description) lines.push("DESCRIPTION:" + icsEscape(opts.description));
    if (opts.url) lines.push("URL:" + opts.url);
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.map(icsFold).join("\r\n") + "\r\n";
  }

  function hashString(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return h;
  }

  function googleCalendarUrl(opts) {
    const start = toMs(opts.start);
    const end = start + Math.max(1, Number(opts.durationMin) || DEFAULT_DURATION_MIN) * MINUTE;
    const p = [
      "action=TEMPLATE",
      "text=" + encodeURIComponent(opts.title || "Meeting (somoclox)"),
      "dates=" + icsDateUtc(start) + "/" + icsDateUtc(end),
    ];
    if (opts.description) p.push("details=" + encodeURIComponent(opts.description));
    return "https://calendar.google.com/calendar/render?" + p.join("&");
  }

  return {
    DEFAULT_CITIES: DEFAULT_CITIES,
    MINUTE: MINUTE,
    HOUR: HOUR,
    DAY: DAY,
    getOffsetMs: getOffsetMs,
    formatOffsetLabel: formatOffsetLabel,
    getWallParts: getWallParts,
    getDSTInfo: getDSTInfo,
    resolveLocal: resolveLocal,
    dayShiftLabel: dayShiftLabel,
    calendarDiffDays: calendarDiffDays,
    formatDuration: formatDuration,
    shortName: shortName,
    friendlyName: friendlyName,
    describeGap: describeGap,
    convert: convert,
    convertMany: convertMany,
    nextOffsetChange: nextOffsetChange,
    dstWarnings: dstWarnings,
    parseHm: parseHm,
    findMeetingOverlap: findMeetingOverlap,
    workIntervalOnDate: workIntervalOnDate,
    axisDayBounds: axisDayBounds,
    clipInterval: clipInterval,
    listTimeZones: listTimeZones,
    resolveZone: resolveZone,
    sameZone: sameZone,
    preferredZone: preferredZone,
    searchTimeZones: searchTimeZones,
    formatTime: formatTime,
    formatTimeShort: formatTimeShort,
    formatDate: formatDate,
    isoDate: isoDate,
    parseIsoDate: parseIsoDate,
    parseIsoTime: parseIsoTime,
    detectTimeZone: detectTimeZone,
    encodeState: encodeState,
    decodeState: decodeState,
    parseZoneEntry: parseZoneEntry,
    encodeZoneEntry: encodeZoneEntry,
    acceptedTimeZone: acceptedTimeZone,
    pickDisplayLabel: pickDisplayLabel,
    usableZoneName: usableZoneName,
    pad2: pad2,
    countryCodeForZone: countryCodeForZone,
    countryDisplayName: countryDisplayName,
    timeZoneLongName: timeZoneLongName,
    placeLabel: placeLabel,
    DEFAULT_DURATION_MIN: DEFAULT_DURATION_MIN,
    DURATION_CHOICES: DURATION_CHOICES,
    parseDuration: parseDuration,
    WEEKEND_BY_COUNTRY: WEEKEND_BY_COUNTRY,
    DEFAULT_WEEKEND: DEFAULT_WEEKEND,
    weekdayIndex: weekdayIndex,
    weekendDays: weekendDays,
    formatWeekendDays: formatWeekendDays,
    weekendInfo: weekendInfo,
    snapInstant: snapInstant,
    pickOnBar: pickOnBar,
    instantFraction: instantFraction,
    formatShortDate: formatShortDate,
    formatShareText: formatShareText,
    formatSpan: formatSpan,
    formatCountdown: formatCountdown,
    formatScrubOffset: formatScrubOffset,
    daylightPhase: daylightPhase,
    daylightSegments: daylightSegments,
    icsDateUtc: icsDateUtc,
    icsEscape: icsEscape,
    icsFold: icsFold,
    buildIcs: buildIcs,
    googleCalendarUrl: googleCalendarUrl,
  };
});
