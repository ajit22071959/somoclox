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

  function getOffsetMs(timeZone, instant) {
    const date = new Date(toMs(instant));
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
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
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
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

  function describeGap(fromZone, toZone, instant) {
    const fromOff = getOffsetMs(fromZone, instant);
    const toOff = getOffsetMs(toZone, instant);
    const minutes = Math.round((toOff - fromOff) / MINUTE);
    const fromName = shortName(fromZone);
    const toName = shortName(toZone);
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

  function findMeetingOverlap(options) {
    const zones = options.zones;
    const date = options.date;
    const startMin = options.workStartMin != null ? options.workStartMin : parseHm(options.workStart || "09:00");
    const endMin = options.workEndMin != null ? options.workEndMin : parseHm(options.workEnd || "18:00");
    if (!zones || zones.length === 0) {
      return { intervals: [], none: true, formatted: [], workStartMin: startMin, workEndMin: endMin };
    }
    let current = null;
    for (let i = 0; i < zones.length; i++) {
      const iv = workIntervalOnDate(zones[i], date.year, date.month, date.day, startMin, endMin);
      current = current == null ? iv : intersectIntervals(current, iv);
    }
    const intervals = current || [];
    const formatted = intervals.map(function (iv) {
      return {
        start: iv.start,
        end: iv.end,
        durationMin: Math.round((iv.end - iv.start) / MINUTE),
        inZones: zones.map(function (z) {
          return {
            timeZone: z,
            start: getWallParts(z, iv.start),
            end: getWallParts(z, iv.end),
          };
        }),
      };
    });
    return {
      intervals: intervals,
      none: intervals.length === 0,
      formatted: formatted,
      workStartMin: startMin,
      workEndMin: endMin,
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

  function searchTimeZones(query, zones) {
    const list = zones || listTimeZones();
    const q = String(query || "").trim().toLowerCase();
    if (!q) {
      return list.map(function (z) {
        return { timeZone: z, name: friendlyName(z), short: shortName(z) };
      });
    }
    const scored = [];
    for (let i = 0; i < list.length; i++) {
      const z = list[i];
      const name = friendlyName(z);
      const short = shortName(z);
      const hay = (z + " " + name + " " + short + " " + aliasesFor(z).join(" ")).toLowerCase();
      let score = -1;
      if (short.toLowerCase() === q || name.toLowerCase() === q || z.toLowerCase() === q) score = 0;
      else if (short.toLowerCase().indexOf(q) === 0) score = 1;
      else if (name.toLowerCase().indexOf(q) === 0) score = 2;
      else if (hay.indexOf(q) !== -1) score = 3;
      if (score >= 0) scored.push({ timeZone: z, name: name, short: short, score: score });
    }
    scored.sort(function (a, b) {
      if (a.score !== b.score) return a.score - b.score;
      return a.name.localeCompare(b.name);
    });
    return scored;
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

  function encodeState(state) {
    const p = new URLSearchParams();
    if (state.zones && state.zones.length) p.set("z", state.zones.join(","));
    if (state.from) p.set("from", state.from);
    if (state.to && state.to.length) p.set("to", state.to.join(","));
    if (state.date) p.set("d", state.date);
    if (state.time) p.set("t", state.time);
    if (state.meetingDate) p.set("md", state.meetingDate);
    p.set("h", state.hour12 ? "12" : "24");
    if (state.workStart) p.set("ws", state.workStart);
    if (state.workEnd) p.set("we", state.workEnd);
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
    const hour = p.get("h");
    return {
      zones: list("z"),
      from: p.get("from") || "",
      to: list("to"),
      date: p.get("d") || "",
      time: p.get("t") || "",
      meetingDate: p.get("md") || "",
      hour12: hour === "12",
      workStart: p.get("ws") || "",
      workEnd: p.get("we") || "",
    };
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
    pad2: pad2,
  };
});
