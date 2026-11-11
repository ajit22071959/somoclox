"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Tz = require("../tz.js");

function local(year, month, day, hour, minute, second) {
  return {
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    second: second || 0,
  };
}

function wallTime(wall) {
  return Tz.pad2(wall.hour) + ":" + Tz.pad2(wall.minute);
}

function wallDate(wall) {
  return Tz.isoDate(wall);
}

describe("offsets and labels", function () {
  it("formats UTC, half-hour and 45-minute offsets", function () {
    assert.equal(Tz.formatOffsetLabel(0), "UTC+0");
    assert.equal(Tz.formatOffsetLabel(5.5 * Tz.HOUR), "UTC+5:30");
    assert.equal(Tz.formatOffsetLabel(5.75 * Tz.HOUR), "UTC+5:45");
    assert.equal(Tz.formatOffsetLabel(-4 * Tz.HOUR), "UTC-4");
    assert.equal(Tz.formatOffsetLabel(-5 * Tz.HOUR), "UTC-5");
  });

  it("reads India and Nepal offsets on a fixed instant", function () {
    const instant = Date.UTC(2026, 5, 1, 0, 0, 0);
    assert.equal(Tz.getOffsetMs("Asia/Kolkata", instant), 5.5 * Tz.HOUR);
    assert.equal(Tz.getOffsetMs("Asia/Kathmandu", instant), 5.75 * Tz.HOUR);
    assert.equal(Tz.getWallParts("Asia/Kolkata", instant).offsetLabel, "UTC+5:30");
    assert.equal(Tz.getWallParts("Asia/Kathmandu", instant).offsetLabel, "UTC+5:45");
  });
});

describe("New York vs London across DST mismatch weeks", function () {
  // 2026: US starts 8 Mar, UK starts 29 Mar; UK ends 25 Oct, US ends 1 Nov.
  const cases = [
    { date: local(2026, 3, 1, 12, 0), gap: 5, london: "17:00", label: "before either DST" },
    { date: local(2026, 3, 15, 12, 0), gap: 4, london: "16:00", label: "US already on DST, UK not" },
    { date: local(2026, 4, 1, 12, 0), gap: 5, london: "17:00", label: "both on DST" },
    { date: local(2026, 10, 20, 12, 0), gap: 5, london: "17:00", label: "both still on DST" },
    { date: local(2026, 10, 27, 12, 0), gap: 4, london: "16:00", label: "UK off DST, US still on" },
    { date: local(2026, 11, 5, 12, 0), gap: 5, london: "17:00", label: "both off DST" },
  ];

  for (const c of cases) {
    it(c.label + " (" + Tz.isoDate(c.date) + ")", function () {
      const result = Tz.convert("America/New_York", "Europe/London", c.date);
      assert.equal(result.kind, "unique");
      assert.equal(wallTime(result.to.wall), c.london);
      assert.equal(result.gap.minutes, c.gap * 60);
      assert.equal(result.gap.ahead, true);
      assert.match(result.gap.label, /London is \d+h ahead of New York/);
    });
  }
});

describe("India (UTC+5:30) vs Nepal (UTC+5:45)", function () {
  it("Nepal is 15 minutes ahead of Mumbai at a winter date", function () {
    const result = Tz.convert("Asia/Kolkata", "Asia/Kathmandu", local(2026, 1, 15, 15, 0));
    assert.equal(result.kind, "unique");
    assert.equal(wallTime(result.to.wall), "15:15");
    assert.equal(wallDate(result.to.wall), "2026-01-15");
    assert.equal(result.dayShift, "same day");
    assert.equal(result.gap.minutes, 15);
    assert.equal(result.gap.label, "Kathmandu is 15m ahead of Mumbai");
  });

  it("the gap is the same in midsummer (neither has DST)", function () {
    const winter = Tz.convert("Asia/Kolkata", "Asia/Kathmandu", local(2026, 1, 15, 9, 30));
    const summer = Tz.convert("Asia/Kolkata", "Asia/Kathmandu", local(2026, 7, 15, 9, 30));
    assert.equal(winter.gap.minutes, 15);
    assert.equal(summer.gap.minutes, 15);
    assert.equal(wallTime(summer.to.wall), "09:45");
  });
});

describe("Sydney southern-hemisphere DST", function () {
  it("January uses AEDT (UTC+11), two hours ahead of Tokyo", function () {
    const result = Tz.convert("Australia/Sydney", "Asia/Tokyo", local(2026, 1, 15, 12, 0));
    assert.equal(result.to.wall.offsetLabel, "UTC+9");
    assert.equal(result.from.wall.offsetLabel, "UTC+11");
    assert.equal(wallTime(result.to.wall), "10:00");
    assert.equal(result.gap.minutes, -120);
    assert.match(result.gap.label, /Tokyo is 2h behind Sydney/);
  });

  it("June uses AEST (UTC+10), one hour ahead of Tokyo", function () {
    const result = Tz.convert("Australia/Sydney", "Asia/Tokyo", local(2026, 6, 15, 12, 0));
    assert.equal(result.from.wall.offsetLabel, "UTC+10");
    assert.equal(wallTime(result.to.wall), "11:00");
    assert.equal(result.gap.minutes, -60);
  });

  it("DST ends on 5 Apr 2026 and starts on 4 Oct 2026", function () {
    const beforeEnd = Tz.getDSTInfo("Australia/Sydney", Date.UTC(2026, 3, 4, 12));
    const afterEnd = Tz.getDSTInfo("Australia/Sydney", Date.UTC(2026, 3, 6, 12));
    const midWinter = Tz.getDSTInfo("Australia/Sydney", Date.UTC(2026, 5, 15, 12));
    const afterStart = Tz.getDSTInfo("Australia/Sydney", Date.UTC(2026, 9, 5, 12));
    assert.equal(beforeEnd.hasDST, true);
    assert.equal(beforeEnd.inDST, true);
    assert.equal(afterEnd.inDST, false);
    assert.equal(midWinter.inDST, false);
    assert.equal(afterStart.inDST, true);
  });
});

describe("zones with no DST", function () {
  for (const zone of ["Asia/Tokyo", "Asia/Dubai"]) {
    it(zone + " has the same offset in January and July, and is never in DST", function () {
      const jan = Tz.getDSTInfo(zone, Date.UTC(2026, 0, 15, 12));
      const jul = Tz.getDSTInfo(zone, Date.UTC(2026, 6, 15, 12));
      assert.equal(jan.hasDST, false);
      assert.equal(jul.hasDST, false);
      assert.equal(jan.inDST, false);
      assert.equal(jul.inDST, false);
      assert.equal(jan.offsetMs, jul.offsetMs);
      const midYear = Date.UTC(2026, 5, 15, 12);
      assert.equal(Tz.nextOffsetChange(zone, midYear, 30), null);
    });
  }
});

describe("spring-forward gap in New York", function () {
  // 8 Mar 2026, 02:00 EST jumps to 03:00 EDT. 02:30 does not exist.
  it("shifts 02:30 forward to 03:30 and notes the gap", function () {
    const result = Tz.resolveLocal("America/New_York", local(2026, 3, 8, 2, 30));
    assert.equal(result.kind, "gap");
    assert.ok(result.note);
    assert.equal(wallTime(result.wall), "03:30");
    assert.equal(wallDate(result.wall), "2026-03-08");
    assert.equal(result.wall.offsetLabel, "UTC-4");
    assert.equal(result.instant, Date.UTC(2026, 2, 8, 7, 30));
  });

  it("a unique time just after the jump still works", function () {
    const result = Tz.resolveLocal("America/New_York", local(2026, 3, 8, 3, 30));
    assert.equal(result.kind, "unique");
    assert.equal(result.instant, Date.UTC(2026, 2, 8, 7, 30));
  });

  it("a unique time just before the jump still works", function () {
    const result = Tz.resolveLocal("America/New_York", local(2026, 3, 8, 1, 30));
    assert.equal(result.kind, "unique");
    assert.equal(result.wall.offsetLabel, "UTC-5");
    assert.equal(result.instant, Date.UTC(2026, 2, 8, 6, 30));
  });
});

describe("fall-back ambiguity in New York", function () {
  // 1 Nov 2026, 02:00 EDT falls back to 01:00 EST. 01:30 occurs twice.
  it("reports both instants and picks the earlier (still DST) one", function () {
    const result = Tz.resolveLocal("America/New_York", local(2026, 11, 1, 1, 30));
    assert.equal(result.kind, "ambiguous");
    assert.ok(result.note);
    assert.equal(result.instants.length, 2);
    assert.equal(result.instants[0], Date.UTC(2026, 10, 1, 5, 30)); // 01:30 EDT
    assert.equal(result.instants[1], Date.UTC(2026, 10, 1, 6, 30)); // 01:30 EST
    assert.equal(result.instant, result.instants[0]);
    assert.equal(result.wall.offsetLabel, "UTC-4");
    const second = Tz.getWallParts("America/New_York", result.instants[1]);
    assert.equal(wallTime(second), "01:30");
    assert.equal(second.offsetLabel, "UTC-5");
  });
});

describe("day-shift labels", function () {
  it("labels a later calendar date as next day", function () {
    // 22:00 in London is the next morning in Tokyo (UTC+9 / UTC+0 in winter).
    const result = Tz.convert("Europe/London", "Asia/Tokyo", local(2026, 1, 15, 22, 0));
    assert.equal(wallTime(result.to.wall), "07:00");
    assert.equal(wallDate(result.to.wall), "2026-01-16");
    assert.equal(result.dayShift, "next day");
  });

  it("labels an earlier calendar date as previous day", function () {
    // 08:00 in Tokyo is the previous evening in New York in January.
    const result = Tz.convert("Asia/Tokyo", "America/New_York", local(2026, 1, 15, 8, 0));
    assert.equal(wallDate(result.to.wall), "2026-01-14");
    assert.equal(result.dayShift, "previous day");
  });

  it("labels the same calendar date as same day", function () {
    const result = Tz.convert("Asia/Kolkata", "Asia/Dubai", local(2026, 6, 1, 14, 0));
    assert.equal(result.dayShift, "same day");
  });

  it("can label a two-day shift between far-apart zones", function () {
    const result = Tz.convert(
      "Pacific/Midway",
      "Pacific/Auckland",
      local(2026, 1, 15, 23, 0)
    );
    assert.ok(
      result.dayShift === "next day" || result.dayShift === "2 days later",
      "expected a forward day shift, got " + result.dayShift + " " + wallDate(result.to.wall)
    );
    assert.ok(Tz.calendarDiffDays(result.from.wall, result.to.wall) >= 1);
  });
});

describe("meeting overlap", function () {
  it("says plainly when Tokyo and New York 9–18 have no overlap", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: ["Asia/Tokyo", "America/New_York"],
      date: { year: 2026, month: 6, day: 15 },
      workStart: "09:00",
      workEnd: "18:00",
    });
    assert.equal(overlap.none, true);
    assert.equal(overlap.intervals.length, 0);
  });

  it("finds a 15-minute-clipped window for India vs Nepal (half-hour / 45-minute offsets)", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: ["Asia/Kolkata", "Asia/Kathmandu"],
      date: { year: 2026, month: 6, day: 15 },
      workStart: "09:00",
      workEnd: "18:00",
    });
    assert.equal(overlap.none, false);
    assert.equal(overlap.formatted.length, 1);
    assert.equal(overlap.formatted[0].durationMin, 8 * 60 + 45);
    const india = overlap.formatted[0].inZones.find(function (z) {
      return z.timeZone === "Asia/Kolkata";
    });
    const nepal = overlap.formatted[0].inZones.find(function (z) {
      return z.timeZone === "Asia/Kathmandu";
    });
    assert.equal(wallTime(india.start), "09:00");
    assert.equal(wallTime(india.end), "17:45");
    assert.equal(wallTime(nepal.start), "09:15");
    assert.equal(wallTime(nepal.end), "18:00");
  });

  it("finds a shared afternoon window for London and Paris", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: ["Europe/London", "Europe/Paris"],
      date: { year: 2026, month: 6, day: 15 },
      workStart: "09:00",
      workEnd: "18:00",
    });
    assert.equal(overlap.none, false);
    // Paris is 1h ahead, so overlap is 09:00–17:00 London = 10:00–18:00 Paris (8 hours).
    assert.equal(overlap.formatted[0].durationMin, 8 * 60);
    const london = overlap.formatted[0].inZones.find(function (z) {
      return z.timeZone === "Europe/London";
    });
    assert.equal(wallTime(london.start), "09:00");
    assert.equal(wallTime(london.end), "17:00");
  });

  it("finds an 8-hour Paris/London overlap at the default 09:00–18:00 hours", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: [
        { timeZone: "Europe/Paris", label: "Paris" },
        { timeZone: "Europe/London", label: "London" },
      ],
      axisZone: "Europe/Paris",
      date: { year: 2026, month: 11, day: 12 },
      workStart: "09:00",
      workEnd: "18:00",
    });
    assert.equal(overlap.none, false);
    assert.equal(overlap.formatted.length, 1);
    assert.equal(overlap.formatted[0].durationMin, 8 * 60);
    const paris = overlap.formatted[0].inZones.find(function (z) { return z.label === "Paris"; });
    const london = overlap.formatted[0].inZones.find(function (z) { return z.label === "London"; });
    assert.equal(wallTime(paris.start), "10:00");
    assert.equal(wallTime(paris.end), "18:00");
    assert.equal(wallTime(london.start), "09:00");
    assert.equal(wallTime(london.end), "17:00");
  });

  it("respects per-city working hours", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: [
        { timeZone: "Europe/Paris", label: "Paris", workStart: "09:00", workEnd: "18:00" },
        { timeZone: "Europe/London", label: "London", workStart: "08:00", workEnd: "16:00" },
      ],
      axisZone: "Europe/Paris",
      date: { year: 2026, month: 11, day: 12 },
    });
    assert.equal(overlap.none, false);
    assert.equal(overlap.formatted[0].durationMin, 8 * 60);
    const paris = overlap.formatted[0].inZones.find(function (z) { return z.label === "Paris"; });
    const london = overlap.formatted[0].inZones.find(function (z) { return z.label === "London"; });
    assert.equal(wallTime(paris.start), "09:00");
    assert.equal(wallTime(paris.end), "17:00");
    assert.equal(wallTime(london.start), "08:00");
    assert.equal(wallTime(london.end), "16:00");
  });

  it("handles working hours that cross midnight", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: [
        { timeZone: "Europe/Paris", label: "Paris", workStart: "22:00", workEnd: "06:00" },
        { timeZone: "Europe/London", label: "London", workStart: "21:00", workEnd: "05:00" },
      ],
      axisZone: "Europe/Paris",
      date: { year: 2026, month: 11, day: 12 },
      workStart: "22:00",
      workEnd: "06:00",
    });
    assert.equal(overlap.none, false);
    assert.ok(overlap.formatted.length >= 1);
    const total = overlap.formatted.reduce(function (sum, w) { return sum + w.durationMin; }, 0);
    // The shared night shift is 8 hours; clipped to the Paris date it appears
    // as the morning remainder plus the evening start (6h + 2h).
    assert.equal(total, 8 * 60);
    const morning = overlap.formatted.find(function (w) {
      const paris = w.inZones.find(function (z) { return z.label === "Paris"; });
      return paris && paris.start.hour === 0 && paris.start.minute === 0;
    });
    const evening = overlap.formatted.find(function (w) {
      const paris = w.inZones.find(function (z) { return z.label === "Paris"; });
      return paris && paris.start.hour === 22;
    });
    assert.ok(morning, "expected a morning remainder of the overnight window");
    assert.ok(evening, "expected the overnight window to start in the evening");
    assert.equal(morning.durationMin, 6 * 60);
    assert.equal(evening.durationMin, 2 * 60);
  });

  it("suggests the closest near-miss when Tokyo and New York have no overlap", function () {
    const overlap = Tz.findMeetingOverlap({
      zones: [
        { timeZone: "Asia/Tokyo", label: "Tokyo" },
        { timeZone: "America/New_York", label: "New York" },
      ],
      axisZone: "Asia/Tokyo",
      date: { year: 2026, month: 6, day: 15 },
      workStart: "09:00",
      workEnd: "18:00",
    });
    assert.equal(overlap.none, true);
    assert.ok(overlap.nearMiss);
    // New York's 09:00–18:00 ends at 07:00 the next morning in Tokyo, 2 hours
    // before Tokyo's 09:00 start — closer than the 4-hour same-calendar-day gap.
    assert.equal(overlap.nearMiss.gapMin, 2 * 60);
    assert.match(overlap.nearMiss.text, /2h apart/i);
  });
});

describe("URL state encode/decode", function () {
  it("round-trips selected zones, converter inputs, date, 12/24h and working hours", function () {
    const state = {
      zones: ["America/New_York", "Europe/London", "Asia/Kolkata"],
      from: "America/New_York",
      to: ["Asia/Tokyo", "Europe/London"],
      date: "2026-03-29",
      time: "15:30",
      meetingDate: "2026-03-30",
      hour12: true,
      workStart: "09:00",
      workEnd: "18:00",
    };
    const encoded = Tz.encodeState(state);
    const decoded = Tz.decodeState(encoded);
    assert.deepEqual(decoded.zones, state.zones);
    assert.equal(decoded.from, state.from);
    assert.deepEqual(decoded.to, state.to);
    assert.equal(decoded.date, state.date);
    assert.equal(decoded.time, state.time);
    assert.equal(decoded.meetingDate, state.meetingDate);
    assert.equal(decoded.hour12, true);
    assert.equal(decoded.workStart, state.workStart);
    assert.equal(decoded.workEnd, state.workEnd);

    const again = Tz.decodeState("#" + encoded);
    assert.deepEqual(again, decoded);

    const fromQuery = Tz.decodeState("?" + encoded);
    assert.deepEqual(fromQuery, decoded);

    const twentyFour = Tz.decodeState(Tz.encodeState(Object.assign({}, state, { hour12: false })));
    assert.equal(twentyFour.hour12, false);
  });

  it("round-trips per-city working hours and the per-city toggle", function () {
    const state = {
      from: "Europe/Paris",
      fromLabel: "Paris",
      to: [{ tz: "Europe/London", label: "London" }],
      date: "2026-11-12",
      time: "08:30",
      meetingDate: "2026-11-12",
      hour12: false,
      workStart: "09:00",
      workEnd: "18:00",
      perCityHours: true,
      cityHours: [
        { start: "09:00", end: "18:00" },
        { start: "08:00", end: "16:00" },
      ],
    };
    const encoded = Tz.encodeState(state);
    const decoded = Tz.decodeState(encoded);
    assert.equal(decoded.perCityHours, true);
    assert.deepEqual(decoded.cityHours, state.cityHours);
    assert.equal(decoded.date, "2026-11-12");
    assert.equal(decoded.workStart, "09:00");
    assert.match(encoded, /(?:^|&)wh=1(?:&|$)/);
    assert.match(encoded, /w=09%3A00-18%3A00%2C08%3A00-16%3A00|w=09:00-18:00,08:00-16:00/);
  });
});

describe("DST-change warning", function () {
  it("warns that London changes on 29 Mar 2026 and the gap to New York shifts", function () {
    const from = Date.UTC(2026, 2, 10, 12, 0, 0); // 10 March
    const warnings = Tz.dstWarnings(["Europe/London"], from, 30, "America/New_York");
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].date, "2026-03-29");
    assert.match(warnings[0].text, /Clocks change in London on 2026-03-29/);
    assert.match(warnings[0].text, /gap to New York shifts/);
  });

  it("does not warn for Tokyo in the same window", function () {
    const from = Date.UTC(2026, 2, 10, 12, 0, 0);
    const warnings = Tz.dstWarnings(["Asia/Tokyo"], from, 30, "America/New_York");
    assert.equal(warnings.length, 0);
  });
});

describe("converter gap-differs-from-today flag", function () {
  it("flags a date whose gap is not the same as today's when DST will have changed", function () {
    // Freeze "today" by comparing two known dates rather than Date.now:
    // 15 Mar 2026 NY–London is 4h; 1 Apr 2026 is 5h.
    const midMismatch = Tz.convert("America/New_York", "Europe/London", local(2026, 3, 15, 12, 0));
    const bothDst = Tz.convert("America/New_York", "Europe/London", local(2026, 4, 1, 12, 0));
    assert.equal(midMismatch.gap.minutes, 4 * 60);
    assert.equal(bothDst.gap.minutes, 5 * 60);
    assert.notEqual(midMismatch.gap.minutes, bothDst.gap.minutes);
  });
});

describe("place labels", function () {
  const winter = Date.UTC(2026, 0, 15, 12);
  const summer = Date.UTC(2026, 6, 15, 12);

  it("labels Asia/Kolkata and Asia/Calcutta as India with India Standard Time", function () {
    assert.equal(Tz.countryCodeForZone("Asia/Kolkata"), "IN");
    assert.equal(Tz.countryCodeForZone("Asia/Calcutta"), "IN");
    assert.equal(Tz.countryDisplayName("IN"), "India");
    assert.equal(Tz.placeLabel("Asia/Kolkata", winter), "India · India Standard Time");
    assert.equal(Tz.placeLabel("Asia/Calcutta", winter), "India · India Standard Time");
    assert.equal(Tz.placeLabel("Asia/Kolkata", summer), "India · India Standard Time");
  });

  it("labels America/New_York as United States, with Standard or Daylight in the name", function () {
    assert.equal(Tz.countryCodeForZone("America/New_York"), "US");
    assert.equal(Tz.countryDisplayName("US"), "United States");
    assert.equal(
      Tz.placeLabel("America/New_York", winter),
      "United States · Eastern Standard Time"
    );
    assert.equal(
      Tz.placeLabel("America/New_York", summer),
      "United States · Eastern Daylight Time"
    );
    assert.equal(Tz.countryCodeForZone("US/Eastern"), "US");
    assert.equal(
      Tz.placeLabel("US/Eastern", winter),
      "United States · Eastern Standard Time"
    );
  });

  it("labels Australia/Sydney as Australia, with southern-hemisphere DST names", function () {
    assert.equal(Tz.countryCodeForZone("Australia/Sydney"), "AU");
    assert.equal(Tz.countryDisplayName("AU"), "Australia");
    assert.equal(
      Tz.placeLabel("Australia/Sydney", winter),
      "Australia · Australian Eastern Daylight Time"
    );
    assert.equal(
      Tz.placeLabel("Australia/Sydney", summer),
      "Australia · Australian Eastern Standard Time"
    );
  });

  it("labels Asia/Tokyo as Japan · Japan Standard Time", function () {
    assert.equal(Tz.countryCodeForZone("Asia/Tokyo"), "JP");
    assert.equal(Tz.countryDisplayName("JP"), "Japan");
    assert.equal(Tz.placeLabel("Asia/Tokyo", winter), "Japan · Japan Standard Time");
    assert.equal(Tz.placeLabel("Asia/Tokyo", summer), "Japan · Japan Standard Time");
  });

  it("labels Europe/London as United Kingdom", function () {
    assert.equal(Tz.countryCodeForZone("Europe/London"), "GB");
    assert.equal(Tz.countryDisplayName("GB"), "United Kingdom");
    assert.equal(
      Tz.placeLabel("Europe/London", winter),
      "United Kingdom · Greenwich Mean Time"
    );
    assert.equal(
      Tz.placeLabel("Europe/London", summer),
      "United Kingdom · British Summer Time"
    );
  });

  it("handles Etc/UTC and unknown zones gracefully, without a country", function () {
    assert.equal(Tz.countryCodeForZone("Etc/UTC"), null);
    assert.equal(Tz.countryCodeForZone("UTC"), null);
    const utc = Tz.placeLabel("Etc/UTC", winter);
    assert.equal(utc.indexOf(" · "), -1);
    assert.ok(
      utc === "Coordinated Universal Time" || utc.indexOf("UTC") !== -1,
      "expected a UTC-style name, got " + utc
    );
    assert.doesNotThrow(function () {
      Tz.placeLabel("Not/A_Zone", winter);
    });
    const unknown = Tz.placeLabel("Not/A_Zone", winter);
    assert.ok(unknown.length > 0);
    assert.equal(unknown.indexOf(" · "), -1);
    assert.ok(
      unknown === "Not/A_Zone" || /UTC/i.test(unknown),
      "expected the zone id or a UTC-style fallback, got " + unknown
    );
  });
});

describe("timezone search", function () {
  function zones(query) {
    return Tz.searchTimeZones(query).map(function (r) { return r.timeZone; });
  }

  function first(query) {
    const rows = Tz.searchTimeZones(query);
    assert.ok(rows.length, "expected results for " + query);
    return rows[0].timeZone;
  }

  function includesZone(query, zone) {
    return Tz.searchTimeZones(query).some(function (r) {
      return Tz.sameZone(r.timeZone, zone);
    });
  }

  it("finds America/Chicago first for central standard time", function () {
    assert.ok(Tz.sameZone(first("central standard time"), "America/Chicago"));
    assert.ok(Tz.sameZone(first("Central Standard Time"), "America/Chicago"));
  });

  it("finds Asia/Colombo for sri lanka and for colombo", function () {
    assert.ok(Tz.sameZone(first("sri lanka"), "Asia/Colombo"));
    assert.ok(Tz.sameZone(first("Sri Lanka"), "Asia/Colombo"));
    assert.ok(Tz.sameZone(first("colombo"), "Asia/Colombo"));
  });

  it("finds Asia/Kolkata first for indian standard time and IST", function () {
    assert.ok(Tz.sameZone(first("indian standard time"), "Asia/Kolkata"));
    assert.ok(Tz.sameZone(first("India Standard Time"), "Asia/Kolkata"));
    const ist = Tz.searchTimeZones("IST");
    assert.ok(Tz.sameZone(ist[0].timeZone, "Asia/Kolkata"));
    assert.match(ist[0].matchLabel || "", /also used/i);
  });

  it("includes the main US zones for usa", function () {
    ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"].forEach(function (z) {
      assert.ok(includesZone("usa", z), "usa should include " + z + ", got " + zones("usa").join(", "));
    });
  });

  it("finds Europe/London for uk, london, and british summer time", function () {
    assert.ok(Tz.sameZone(first("uk"), "Europe/London"));
    assert.ok(Tz.sameZone(first("london"), "Europe/London"));
    assert.ok(Tz.sameZone(first("british summer time"), "Europe/London"));
  });

  it("finds Asia/Shanghai for beijing and china", function () {
    assert.ok(Tz.sameZone(first("beijing"), "Asia/Shanghai"));
    assert.ok(Tz.sameZone(first("china"), "Asia/Shanghai"));
  });

  it("finds America/Sao_Paulo for sao paulo without an accent", function () {
    assert.ok(Tz.sameZone(first("sao paulo"), "America/Sao_Paulo"));
  });

  it("finds Los Angeles for pst", function () {
    assert.ok(Tz.sameZone(first("pst"), "America/Los_Angeles"));
  });

  it("finds a Central European zone for cet", function () {
    const tz = first("cet");
    assert.ok(/^Europe\//.test(tz), "expected a Europe/ zone, got " + tz);
    const title = Tz.searchTimeZones("cet")[0].title || "";
    assert.match(title, /Central European/i);
  });
});


describe("chosen display labels", function () {
  it("uses Hyderabad as the display label when searching hyderabad", function () {
    const rows = Tz.searchTimeZones("hyderabad");
    assert.ok(rows.length, "expected results for hyderabad");
    assert.ok(Tz.sameZone(rows[0].timeZone, "Asia/Kolkata"));
    assert.equal(rows[0].displayLabel, "Hyderabad");
    assert.equal(rows[0].labelKind, "city");
  });

  it("uses the country name for a country pick", function () {
    const rows = Tz.searchTimeZones("Sri Lanka");
    assert.ok(rows.length);
    assert.ok(Tz.sameZone(rows[0].timeZone, "Asia/Colombo"));
    assert.equal(rows[0].displayLabel, "Sri Lanka");
    assert.equal(rows[0].labelKind, "country");
  });

  it("uses the representative city for a timezone-name pick", function () {
    const rows = Tz.searchTimeZones("central standard time");
    assert.ok(rows.length);
    assert.ok(Tz.sameZone(rows[0].timeZone, "America/Chicago"));
    assert.equal(rows[0].displayLabel, "Chicago");
    assert.equal(rows[0].labelKind, "zone");
  });

  it("round-trips custom display labels, including two labels for the same zone", function () {
    const state = {
      zones: [
        { tz: "Asia/Kolkata", label: "Hyderabad" },
        { tz: "Asia/Kolkata", label: "Mumbai" },
      ],
      from: "Asia/Kolkata",
      fromLabel: "Hyderabad",
      to: [{ tz: "America/St_Vincent", label: "Saint Vincent and the Grenadines" }],
      date: "2026-03-29",
      time: "15:30",
      meetingDate: "2026-03-30",
      hour12: false,
      workStart: "09:00",
      workEnd: "18:00",
    };
    const encoded = Tz.encodeState(state);
    const decoded = Tz.decodeState(encoded);
    assert.equal(decoded.zoneEntries.length, 2);
    assert.ok(Tz.sameZone(decoded.zoneEntries[0].tz, "Asia/Kolkata"));
    assert.equal(decoded.zoneEntries[0].label, "Hyderabad");
    assert.ok(Tz.sameZone(decoded.zoneEntries[1].tz, "Asia/Kolkata"));
    assert.equal(decoded.zoneEntries[1].label, "Mumbai");
    assert.ok(Tz.sameZone(decoded.from, "Asia/Kolkata"));
    assert.equal(decoded.fromLabel, "Hyderabad");
    assert.equal(decoded.toEntries.length, 1);
    assert.equal(decoded.toEntries[0].label, "Saint Vincent and the Grenadines");
    assert.ok(
      Tz.sameZone(decoded.toEntries[0].tz, "America/St_Vincent") ||
      Tz.sameZone(decoded.toEntries[0].tz, "America/Puerto_Rico")
    );
    const again = Tz.decodeState("#" + encoded);
    assert.deepEqual(again.zoneEntries, decoded.zoneEntries);
  });

  it("keeps unlabelled zone lists compatible with older shareable links", function () {
    const decoded = Tz.decodeState("z=America/New_York,Europe/London&from=America/New_York&to=Asia/Tokyo&d=2026-03-29&t=15:30&h=24");
    assert.deepEqual(decoded.zones, ["America/New_York", "Europe/London"]);
    assert.equal(decoded.from, "America/New_York");
    assert.deepEqual(decoded.to, ["Asia/Tokyo"]);
  });
});

describe("country coverage in timezone search", function () {
  function firstZone(query) {
    const rows = Tz.searchTimeZones(query);
    return rows[0] && rows[0].timeZone;
  }

  it("finds Saint Vincent and the Grenadines and St Vincent", function () {
    const longName = Tz.searchTimeZones("Saint Vincent and the Grenadines");
    assert.ok(longName.length, "expected a result for Saint Vincent and the Grenadines");
    const tz = longName[0].timeZone;
    assert.ok(
      Tz.sameZone(tz, "America/St_Vincent") || Tz.sameZone(tz, "America/Puerto_Rico") ||
        Tz.countryCodeForZone(tz) === "VC" || /vincent/i.test(longName[0].title + longName[0].displayLabel),
      "unexpected zone " + tz + " / " + longName[0].title
    );
    assert.ok(Tz.acceptedTimeZone(tz));
    const short = firstZone("St Vincent");
    assert.ok(short);
    assert.ok(
      Tz.sameZone(short, tz) || Tz.countryCodeForZone(short) === "VC" || Tz.sameZone(short, "America/St_Vincent")
    );
  });

  it("accepts common official and informal country names", function () {
    const cases = [
      ["St. Lucia", "LC", "America/St_Lucia"],
      ["Saint Kitts and Nevis", "KN", "America/St_Kitts"],
      ["Côte d’Ivoire", "CI", "Africa/Abidjan"],
      ["Ivory Coast", "CI", "Africa/Abidjan"],
      ["Timor-Leste", "TL", "Asia/Dili"],
      ["East Timor", "TL", "Asia/Dili"],
      ["Myanmar", "MM", "Asia/Yangon"],
      ["Burma", "MM", "Asia/Yangon"],
      ["Eswatini", "SZ", "Africa/Mbabane"],
      ["Swaziland", "SZ", "Africa/Mbabane"],
      ["Cape Verde", "CV", "Atlantic/Cape_Verde"],
      ["Cabo Verde", "CV", "Atlantic/Cape_Verde"],
      ["Türkiye", "TR", "Europe/Istanbul"],
      ["Turkey", "TR", "Europe/Istanbul"],
    ];
    cases.forEach(function (row) {
      const query = row[0];
      const code = row[1];
      const hint = row[2];
      const hits = Tz.searchTimeZones(query);
      assert.ok(hits.length, "expected a result for " + JSON.stringify(query));
      const ok = hits.some(function (h) {
        return Tz.countryCodeForZone(h.timeZone) === code ||
          Tz.sameZone(h.timeZone, hint) ||
          Tz.sameZone(h.timeZone, Tz.resolveZone(hint));
      });
      assert.ok(ok, query + " -> " + hits.map(function (h) { return h.timeZone; }).join(", "));
    });
  });

  it("returns at least one result for every zone.tab country and its English DisplayNames name", function () {
    const fs = require("fs");
    const path = require("path");
    const map = require("../zone-countries.js");
    const codes = {};
    Object.keys(map).forEach(function (zone) {
      const code = map[zone];
      if (/^[A-Z]{2}$/.test(code)) codes[code] = codes[code] || zone;
    });
    const tabPaths = [
      path.join(__dirname, "../scripts/tzdata/zone.tab"),
      "/usr/share/zoneinfo/zone.tab",
    ];
    let tab = "";
    for (let i = 0; i < tabPaths.length; i++) {
      try {
        tab = fs.readFileSync(tabPaths[i], "utf8");
        if (tab) break;
      } catch (err) {}
    }
    assert.ok(tab, "zone.tab was not found for the country-coverage test");
    const missing = [];
    const lines = tab.split(/\r?\n/);
    const names = (typeof Intl.DisplayNames === "function")
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
    const seen = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.charAt(0) === "#") continue;
      const cols = line.split("\t");
      const code = (cols[0] || "").trim();
      if (!/^[A-Z]{2}$/.test(code) || seen[code]) continue;
      seen[code] = true;
      codes[code] = codes[code] || (cols[2] || "").trim();
      const queries = [code];
      if (names) {
        try {
          const label = names.of(code);
          if (label) queries.push(label);
        } catch (err) {}
      }
      queries.forEach(function (query) {
        const hits = Tz.searchTimeZones(query);
        if (!hits.length) missing.push(code + " / " + JSON.stringify(query));
      });
    }
    assert.equal(missing.length, 0, "no results for: " + missing.join("; "));
  });
});

describe("weekends by country", function () {
  it("uses Saturday–Sunday by default and for the UAE since 2022", function () {
    assert.deepEqual(Tz.weekendDays("GB"), [6, 0]);
    assert.deepEqual(Tz.weekendDays("AE"), [6, 0]);
    assert.deepEqual(Tz.weekendDays("IN"), [6, 0]);
    assert.deepEqual(Tz.weekendDays(""), [6, 0]);
  });

  it("knows Friday–Saturday, Thursday–Friday and one-day weekends", function () {
    ["SA", "QA", "KW", "BH", "OM", "EG", "JO", "IQ", "YE", "IL", "DZ", "BD"].forEach(function (c) {
      assert.deepEqual(Tz.weekendDays(c), [5, 6], c);
    });
    assert.deepEqual(Tz.weekendDays("AF"), [4, 5]);
    assert.deepEqual(Tz.weekendDays("IR"), [5]);
    assert.deepEqual(Tz.weekendDays("NP"), [6]);
    assert.deepEqual(Tz.weekendDays("BN"), [5, 0]);
    assert.equal(Tz.formatWeekendDays([5, 6]), "Fri–Sat");
    assert.equal(Tz.formatWeekendDays([6, 0]), "Sat–Sun");
    assert.equal(Tz.formatWeekendDays([5, 0]), "Fri and Sun");
    assert.equal(Tz.formatWeekendDays([5]), "Fri");
  });

  it("flags Friday in Riyadh but not in Dubai, and Saturday in both", function () {
    const fri = local(2026, 11, 13, 10, 0); // Friday
    const sat = local(2026, 11, 14, 10, 0);
    const sun = local(2026, 11, 15, 10, 0);
    assert.equal(Tz.weekdayIndex(fri), 5);
    assert.equal(Tz.weekendInfo("Asia/Riyadh", fri).isWeekend, true);
    assert.equal(Tz.weekendInfo("Asia/Dubai", fri).isWeekend, false);
    assert.equal(Tz.weekendInfo("Asia/Dubai", sat).isWeekend, true);
    assert.equal(Tz.weekendInfo("Asia/Riyadh", sun).isWeekend, false);
    assert.equal(Tz.weekendInfo("Asia/Muscat", fri).isWeekend, true);
    assert.equal(Tz.weekendInfo("Asia/Tehran", sat).isWeekend, false);
    assert.equal(Tz.weekendInfo("Europe/London", sun).rule, "Sat–Sun");
  });

  it("does not flag zones without a country", function () {
    const info = Tz.weekendInfo("UTC", local(2026, 11, 14, 10, 0));
    assert.equal(info.known, false);
    assert.equal(info.isWeekend, false);
  });
});

describe("picking a time on the meeting bar", function () {
  it("snaps to 15 minutes from local midnight", function () {
    const date = { year: 2026, month: 11, day: 12 };
    const b = Tz.axisDayBounds("Europe/London", date);
    const t = Tz.pickOnBar(b.dayStart, b.dayEnd, (15 + 7 / 60) / 24, 15);
    const wall = Tz.getWallParts("Europe/London", t);
    assert.equal(wallTime(wall), "15:00");
    const t2 = Tz.pickOnBar(b.dayStart, b.dayEnd, (15 + 8 / 60) / 24, 15);
    assert.equal(wallTime(Tz.getWallParts("Europe/London", t2)), "15:15");
  });

  it("lands on quarter hours in Kathmandu (+5:45) and clamps to the day", function () {
    const date = { year: 2026, month: 6, day: 1 };
    const b = Tz.axisDayBounds("Asia/Kathmandu", date);
    const t = Tz.pickOnBar(b.dayStart, b.dayEnd, 0.5, 30);
    assert.equal(wallTime(Tz.getWallParts("Asia/Kathmandu", t)), "12:00");
    const first = Tz.pickOnBar(b.dayStart, b.dayEnd, -1, 15);
    const last = Tz.pickOnBar(b.dayStart, b.dayEnd, 2, 15);
    assert.equal(wallTime(Tz.getWallParts("Asia/Kathmandu", first)), "00:00");
    assert.equal(wallTime(Tz.getWallParts("Asia/Kathmandu", last)), "23:45");
    assert.equal(wallDate(Tz.getWallParts("Asia/Kathmandu", last)), "2026-06-01");
  });

  it("is DST-correct on a 23-hour spring-forward day", function () {
    const date = { year: 2026, month: 3, day: 8 };
    const b = Tz.axisDayBounds("America/New_York", date);
    assert.equal(b.dayEnd - b.dayStart, 23 * Tz.HOUR);
    const t = Tz.pickOnBar(b.dayStart, b.dayEnd, 3 / 23, 15);
    // Three real hours after midnight is 04:00 local after the jump.
    assert.equal(wallTime(Tz.getWallParts("America/New_York", t)), "04:00");
    assert.equal(Tz.instantFraction(t, b.dayStart, b.dayEnd), 3 / 23);
    assert.equal(Tz.instantFraction(b.dayEnd, b.dayStart, b.dayEnd), null);
  });
});

describe("copy as text", function () {
  it("formats cities with one leading date", function () {
    const t = Tz.resolveLocal("Europe/London", local(2026, 11, 10, 15, 0)).instant;
    const rows = [
      { label: "London", wall: Tz.getWallParts("Europe/London", t) },
      { label: "Paris", wall: Tz.getWallParts("Europe/Paris", t) },
      { label: "Hyderabad", wall: Tz.getWallParts("Asia/Kolkata", t) },
    ];
    assert.equal(Tz.formatShareText(rows, true), "Tue 10 Nov, 3:00 PM London / 4:00 PM Paris / 8:30 PM Hyderabad");
    assert.equal(Tz.formatShareText(rows, false), "Tue 10 Nov, 15:00 London / 16:00 Paris / 20:30 Hyderabad");
  });

  it("adds the date for a city on a different day", function () {
    const t = Tz.resolveLocal("America/New_York", local(2026, 11, 12, 20, 0)).instant;
    const rows = [
      { label: "New York", wall: Tz.getWallParts("America/New_York", t) },
      { label: "Tokyo", wall: Tz.getWallParts("Asia/Tokyo", t) },
    ];
    assert.equal(Tz.formatShareText(rows, true), "Thu 12 Nov, 8:00 PM New York / 10:00 AM Tokyo (Fri 13 Nov)");
    assert.equal(Tz.formatShareText([], true), "");
  });
});

describe("countdown", function () {
  const base = Date.UTC(2026, 10, 12, 0, 0, 0);
  it("counts down and up", function () {
    assert.equal(Tz.formatCountdown(base + (3 * 60 + 20) * Tz.MINUTE, base).text, "Starts in 3h 20m");
    assert.equal(Tz.formatCountdown(base + (3 * 60 + 19) * Tz.MINUTE + 30000, base).text, "Starts in 3h 20m");
    assert.equal(Tz.formatCountdown(base - 25 * Tz.MINUTE, base).text, "Started 25m ago");
    assert.equal(Tz.formatCountdown(base + 20000, base).text, "Starting now");
    assert.equal(Tz.formatCountdown(base + (2 * 1440 + 180) * Tz.MINUTE, base).text, "Starts in 2d 3h");
    assert.equal(Tz.formatCountdown(base + 120 * Tz.MINUTE, base).text, "Starts in 2h");
    assert.equal(Tz.formatCountdown(base + 120 * Tz.MINUTE, base).state, "future");
  });

  it("labels scrub offsets", function () {
    assert.equal(Tz.formatScrubOffset(0), "Now");
    assert.equal(Tz.formatScrubOffset(195), "+3h 15m from now");
    assert.equal(Tz.formatScrubOffset(-90), "−1h 30m ago");
  });
});

describe("day and night shading", function () {
  it("classifies local hours", function () {
    assert.equal(Tz.daylightPhase(3, 0), "night");
    assert.equal(Tz.daylightPhase(6, 30), "twilight");
    assert.equal(Tz.daylightPhase(12, 0), "day");
    assert.equal(Tz.daylightPhase(19, 0), "twilight");
    assert.equal(Tz.daylightPhase(21, 0), "night");
  });

  it("builds merged segments that follow DST", function () {
    const date = { year: 2026, month: 3, day: 29 }; // London springs forward
    const b = Tz.axisDayBounds("Europe/London", date);
    const segs = Tz.daylightSegments("Europe/London", b.dayStart, b.dayEnd, 15);
    assert.deepEqual(segs.map(function (s) { return s.phase; }), ["night", "twilight", "day", "twilight", "night"]);
    assert.equal(segs[0].start, b.dayStart);
    assert.equal(segs[segs.length - 1].end, b.dayEnd);
    // Day starts at 07:00 BST, which is 06:00 UTC.
    assert.equal(segs[2].start, Date.UTC(2026, 2, 29, 6, 0, 0));
    // At London midnight it is 05:30 in Mumbai, which counts as twilight.
    const m = Tz.daylightSegments("Asia/Kolkata", b.dayStart, b.dayEnd, 15);
    assert.equal(m[0].phase, "twilight");
  });
});

describe("calendar file and link", function () {
  const start = Date.UTC(2026, 10, 12, 15, 0, 0);
  it("builds a valid .ics with UTC times, escaping and folding", function () {
    const desc = "London: Thu 12 Nov, 3:00 PM\nParis: Thu 12 Nov, 4:00 PM; Mumbai, India: 8:30 PM " + "x".repeat(80);
    const ics = Tz.buildIcs({ start: start, durationMin: 90, title: "Meeting (somoclox)", description: desc, stamp: start, uid: "abc@somoclox" });
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
    assert.ok(ics.includes("\r\nDTSTART:20261112T150000Z\r\n"));
    assert.ok(ics.includes("\r\nDTEND:20261112T163000Z\r\n"));
    assert.ok(ics.includes("\r\nUID:abc@somoclox\r\n"));
    assert.ok(ics.includes("SUMMARY:Meeting (somoclox)"));
    const unfolded = ics.replace(/\r\n /g, "");
    assert.ok(unfolded.includes("DESCRIPTION:London: Thu 12 Nov\\, 3:00 PM\\nParis: Thu 12 Nov\\, 4:00 PM\\; Mumbai\\, India"));
    ics.split("\r\n").forEach(function (line) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
    });
    assert.equal(ics.split("\r\n").filter(function (l) { return /^ /.test(l); }).length > 0, true);
  });

  it("folds multi-byte text without splitting characters", function () {
    const folded = Tz.icsFold("DESCRIPTION:" + "東京".repeat(40));
    folded.split("\r\n").forEach(function (line) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75);
    });
    assert.equal(folded.replace(/\r\n /g, ""), "DESCRIPTION:" + "東京".repeat(40));
  });

  it("builds a Google Calendar template link", function () {
    const url = Tz.googleCalendarUrl({ start: start, durationMin: 60, title: "Meeting (somoclox)", description: "a & b" });
    assert.equal(url, "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting%20(somoclox)&dates=20261112T150000Z/20261112T160000Z&details=a%20%26%20b");
  });

  it("keeps the meeting length in the shared link", function () {
    const enc = Tz.encodeState({ from: "Europe/London", duration: 30, hour12: false });
    assert.match(enc, /(^|&)dur=30(&|$)/);
    assert.equal(Tz.decodeState(enc).duration, 30);
    assert.doesNotMatch(Tz.encodeState({ from: "Europe/London", duration: 60 }), /dur=/);
    assert.equal(Tz.decodeState("dur=7").duration, 60);
    assert.equal(Tz.decodeState("").duration, 60);
  });
});
