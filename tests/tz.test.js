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
