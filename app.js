/* somoclox page logic. Conversion maths lives in tz.js. */
(function () {
  "use strict";

  const Tz = window.Somoclox;
  const STORAGE_KEY = "somoclox-v1";
  const starSvg =
    '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.6l1.76 3.56 3.93.57-2.85 2.78.67 3.91L8 10.58 4.49 12.42l.67-3.91L2.31 5.73l3.93-.57z"/></svg>';
  const closeSvg =
    '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3.2 3.2l9.6 9.6m0-9.6l-9.6 9.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const els = {
    youHeading: document.getElementById("you-heading"),
    youTime: document.getElementById("you-time"),
    youMeta: document.getElementById("you-meta"),
    clockGrid: document.getElementById("clock-grid"),
    dstNotes: document.getElementById("dst-notes"),
    favs: document.getElementById("favs"),
    fmt24: document.getElementById("fmt-24"),
    fmt12: document.getElementById("fmt-12"),
    copyLink: document.getElementById("copy-link"),
    copyStatus: document.getElementById("copy-status"),
    convDate: document.getElementById("conv-date"),
    convTime: document.getElementById("conv-time"),
    convResults: document.getElementById("conv-results"),
    toTargets: document.getElementById("to-targets"),
    meetDate: document.getElementById("meet-date"),
    workStart: document.getElementById("work-start"),
    workEnd: document.getElementById("work-end"),
    perCityHours: document.getElementById("per-city-hours"),
    perCityRows: document.getElementById("per-city-rows"),
    meetCities: document.getElementById("meet-cities"),
    meetGrid: document.getElementById("meet-shared-hours"),
    sharedStartField: document.getElementById("shared-start-field"),
    sharedEndField: document.getElementById("shared-end-field"),
    meetBar: document.getElementById("meet-bar"),
    meetBarWrap: document.getElementById("meet-bar-wrap"),
    hourGrid: document.getElementById("hour-grid"),
    barLabel: document.getElementById("bar-label"),
    barCaption: document.getElementById("bar-caption"),
    meetWindows: document.getElementById("meet-windows"),
    barChart: document.getElementById("bar-chart"),
    convSummary: document.getElementById("conv-summary"),
    convWhen: document.getElementById("conv-when"),
    countdown: document.getElementById("countdown"),
    convTools: document.getElementById("conv-tools"),
    sharePreview: document.getElementById("share-preview"),
    copyText: document.getElementById("copy-text"),
    duration: document.getElementById("meet-duration"),
    addIcs: document.getElementById("add-ics"),
    gcalLink: document.getElementById("gcal-link"),
    toolStatus: document.getElementById("tool-status"),
    scrub: document.getElementById("scrub"),
    scrubOut: document.getElementById("scrub-out"),
    scrubShade: document.getElementById("scrub-shade"),
    scrubReset: document.getElementById("scrub-reset"),
    copyCompare: document.getElementById("copy-compare"),
    compareStatus: document.getElementById("compare-status"),
  };

  const allZones = Tz.listTimeZones();
  const userZone = (function () {
    const tz = Tz.resolveZone(Tz.detectTimeZone());
    return allZones.indexOf(tz) !== -1 || isKnownZone(tz) ? tz : "UTC";
  })();

  const state = {
    zones: Tz.DEFAULT_CITIES.map(function (c) {
      return { tz: Tz.resolveZone(c.timeZone), label: c.label };
    }),
    favs: [],
    hour12: false,
    from: userZone,
    fromLabel: "",
    to: [],
    date: "",
    time: "",
    meetingDate: "",
    workStart: "09:00",
    workEnd: "18:00",
    perCityHours: false,
    workHours: {},
    meetDateManual: false,
    duration: Tz.DEFAULT_DURATION_MIN,
    scrubMin: 0,
  };

  // Last successful conversion, used by copy, calendar and countdown.
  let lastConv = null;
  // Bounds of the meeting bar's day (axis = From zone), set by renderMeeting.
  let meetBounds = null;

  function isKnownZone(tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
      return true;
    } catch (err) {
      return false;
    }
  }

  function unique(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const tz = Tz.resolveZone(typeof list[i] === "string" ? list[i] : (list[i] && (list[i].tz || list[i].timeZone)));
      if (!tz) continue;
      let seen = false;
      for (let j = 0; j < out.length; j++) {
        if (Tz.sameZone(out[j], tz)) { seen = true; break; }
      }
      if (!seen) out.push(tz);
    }
    return out;
  }

  function entryLabel(entry) {
    if (!entry) return "";
    return entry.label || Tz.shortName(entry.tz);
  }

  function asEntry(value, fallbackLabel) {
    if (!value) return null;
    if (typeof value === "string") {
      const usable = Tz.usableZoneName(value) || Tz.resolveZone(value);
      if (!isKnownZone(usable)) return null;
      return { tz: usable, label: fallbackLabel || Tz.shortName(usable) };
    }
    const raw = value.tz || value.timeZone;
    const usable = Tz.usableZoneName(raw) || Tz.resolveZone(raw) || raw;
    if (!isKnownZone(usable)) return null;
    return { tz: usable, label: value.label || fallbackLabel || Tz.shortName(usable) };
  }

  function sameEntry(a, b) {
    if (!a || !b) return false;
    return Tz.sameZone(a.tz, b.tz) && entryLabel(a) === entryLabel(b);
  }

  function uniqueEntries(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const entry = asEntry(list[i]);
      if (!entry) continue;
      let seen = false;
      for (let j = 0; j < out.length; j++) {
        if (sameEntry(out[j], entry)) { seen = true; break; }
      }
      if (!seen) out.push(entry);
    }
    return out;
  }

  function parseStoredEntries(list) {
    if (!Array.isArray(list)) return [];
    return uniqueEntries(list);
  }

  function labelForZone(tz, entries) {
    for (let i = 0; i < (entries || []).length; i++) {
      if (Tz.sameZone(entries[i].tz, tz)) return entryLabel(entries[i]);
    }
    return Tz.shortName(tz);
  }

  function meetingPeople() {
    const from = asEntry({ tz: state.from, label: state.fromLabel || Tz.shortName(state.from) });
    const list = [];
    if (from) list.push(from);
    (state.to || []).forEach(function (entry) { list.push(entry); });
    return list;
  }

  function hoursKey(entry) {
    return entry.tz + "\t" + entryLabel(entry);
  }

  function hoursFor(entry) {
    if (state.perCityHours) {
      const saved = state.workHours[hoursKey(entry)];
      if (saved && saved.start && saved.end) return { start: saved.start, end: saved.end };
    }
    return { start: state.workStart || "09:00", end: state.workEnd || "18:00" };
  }

  function ensureHours(entry) {
    const key = hoursKey(entry);
    if (!state.workHours[key]) {
      state.workHours[key] = { start: state.workStart || "09:00", end: state.workEnd || "18:00" };
    }
    return state.workHours[key];
  }

  function cityHoursList() {
    return meetingPeople().map(function (entry) { return hoursFor(entry); });
  }

  function applyCityHoursList(list) {
    if (!list || !list.length) return;
    const people = meetingPeople();
    for (let i = 0; i < people.length && i < list.length; i++) {
      state.workHours[hoursKey(people[i])] = {
        start: list[i].start || state.workStart,
        end: list[i].end || state.workEnd,
      };
    }
  }

  function gapLabel(gap, fromLabel, toLabel) {
    const minutes = gap && typeof gap.minutes === "number" ? gap.minutes : 0;
    if (minutes === 0) return toLabel + " is the same time as " + fromLabel;
    if (minutes > 0) return toLabel + " is " + Tz.formatDuration(minutes) + " ahead of " + fromLabel;
    return toLabel + " is " + Tz.formatDuration(-minutes) + " behind " + fromLabel;
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function writeStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        zones: state.zones,
        favs: state.favs,
        hour12: state.hour12,
        workStart: state.workStart,
        workEnd: state.workEnd,
        perCityHours: state.perCityHours,
        workHours: state.workHours,
        duration: state.duration,
      }));
    } catch (err) {
      // Storage may be blocked; the page still works for this visit.
    }
  }

  function defaultToZone() {
    if (userZone !== "Europe/London") return "Europe/London";
    return "America/New_York";
  }

  function todayInZone(zone) {
    return Tz.isoDate(Tz.getWallParts(zone, Date.now()));
  }

  function currentTimeInZone(zone) {
    const wall = Tz.getWallParts(zone, Date.now());
    return Tz.pad2(wall.hour) + ":" + Tz.pad2(wall.minute);
  }

  function applyHashAndStore() {
    const stored = readStore();
    if (stored) {
      if (Array.isArray(stored.zones) && stored.zones.length) {
        const entries = parseStoredEntries(stored.zones);
        if (entries.length) state.zones = entries;
      }
      if (Array.isArray(stored.favs)) state.favs = parseStoredEntries(stored.favs);
      if (typeof stored.hour12 === "boolean") state.hour12 = stored.hour12;
      if (stored.workStart) state.workStart = stored.workStart;
      if (stored.workEnd) state.workEnd = stored.workEnd;
      if (typeof stored.perCityHours === "boolean") state.perCityHours = stored.perCityHours;
      if (stored.workHours && typeof stored.workHours === "object") state.workHours = stored.workHours;
      if (stored.duration) state.duration = Tz.parseDuration(stored.duration);
    }

    const hash = Tz.decodeState(location.hash || location.search);
    const hasHash = !!(location.hash && location.hash.length > 1) ||
      !!(location.search && /(?:^|[?&])(z|from|d|t|h)=/.test(location.search));
    if (hasHash) {
      if (hash.zoneEntries && hash.zoneEntries.length) {
        const entries = parseStoredEntries(hash.zoneEntries);
        if (entries.length) state.zones = entries;
      } else if (hash.zones.length) {
        const entries = parseStoredEntries(hash.zones);
        if (entries.length) state.zones = entries;
      }
      if (hash.from && (isKnownZone(hash.from) || Tz.acceptedTimeZone(hash.from))) {
        const fromEntry = asEntry({ tz: hash.from, label: hash.fromLabel });
        if (fromEntry) {
          state.from = fromEntry.tz;
          state.fromLabel = fromEntry.label;
        }
      }
      if (hash.toEntries && hash.toEntries.length) {
        const entries = parseStoredEntries(hash.toEntries);
        if (entries.length) state.to = entries;
      } else if (hash.to.length) {
        const entries = parseStoredEntries(hash.to);
        if (entries.length) state.to = entries;
      }
      if (hash.date) state.date = hash.date;
      if (hash.time) state.time = hash.time;
      if (hash.meetingDate) state.meetingDate = hash.meetingDate;
      if (location.hash.indexOf("h=") !== -1 || location.search.indexOf("h=") !== -1) {
        state.hour12 = hash.hour12;
      }
      if (/(?:^|[#?&])dur=/.test(location.hash + "&" + location.search)) state.duration = hash.duration;
      if (hash.workStart) state.workStart = hash.workStart;
      if (hash.workEnd) state.workEnd = hash.workEnd;
      if (location.hash.indexOf("wh=") !== -1 || location.search.indexOf("wh=") !== -1) {
        state.perCityHours = hash.perCityHours;
      }
      if (hash.meetingDate && hash.date && hash.meetingDate !== hash.date) {
        state.meetDateManual = true;
      } else {
        state.meetDateManual = false;
      }
    }

    state.zones = uniqueEntries(state.zones);
    state.favs = uniqueEntries(state.favs);
    if (!state.to.length) state.to = [asEntry(defaultToZone())];
    state.to = uniqueEntries(state.to);
    if (!state.date) state.date = todayInZone(userZone);
    if (!state.time) state.time = currentTimeInZone(state.from);
    if (!state.meetingDate) state.meetingDate = state.date;
    if (!state.meetDateManual) state.meetingDate = state.date;
    if (hasHash && hash.cityHours && hash.cityHours.length) {
      applyCityHoursList(hash.cityHours);
    }
  }

  function currentShareState() {
    return {
      zones: state.zones,
      zoneEntries: state.zones,
      from: state.from,
      fromLabel: state.fromLabel,
      to: state.to,
      toEntries: state.to,
      date: state.date,
      time: state.time,
      meetingDate: state.meetingDate,
      hour12: state.hour12,
      workStart: state.workStart,
      workEnd: state.workEnd,
      perCityHours: state.perCityHours,
      cityHours: state.perCityHours ? cityHoursList() : [],
      duration: state.duration,
    };
  }

  function syncHash() {
    const encoded = Tz.encodeState(currentShareState());
    const next = "#" + encoded;
    if (location.hash !== next) {
      history.replaceState(null, "", next);
    }
  }

  function shareUrl() {
    syncHash();
    return location.href;
  }

  function setHour12(value) {
    state.hour12 = !!value;
    els.fmt24.setAttribute("aria-pressed", state.hour12 ? "false" : "true");
    els.fmt12.setAttribute("aria-pressed", state.hour12 ? "true" : "false");
    writeStore();
    syncHash();
    tick();
    renderConverter();
    renderMeeting();
  }

  let tickTimer = 0;

  function msUntilNextMinute() {
    const now = Date.now();
    return 60000 - (now % 60000) + 25;
  }

  function scheduleTick() {
    tick();
    clearTimeout(tickTimer);
    tickTimer = setTimeout(scheduleTick, msUntilNextMinute());
  }

  // The instant shown on the Compare cities cards: now, or now moved by
  // the scrub slider (scrubbed times start from the current quarter hour).
  function compareInstant() {
    const now = Date.now();
    if (!state.scrubMin) return now;
    const quarter = 15 * Tz.MINUTE;
    return Math.floor(now / quarter) * quarter + state.scrubMin * Tz.MINUTE;
  }

  function phaseText(phase) {
    if (phase === "day") return "Daytime";
    if (phase === "twilight") return "Dawn or dusk";
    return "Night";
  }

  function fillTags(box, tz, wall, label) {
    box.innerHTML = "";
    const phase = Tz.daylightPhase(wall.hour, wall.minute);
    const p = document.createElement("span");
    p.className = "tag tag-" + phase;
    p.textContent = phaseText(phase);
    box.appendChild(p);
    const wk = Tz.weekendInfo(tz, wall);
    if (wk.isWeekend) {
      const w = document.createElement("span");
      w.className = "tag tag-weekend";
      w.textContent = "Weekend";
      w.title = wk.dayName + " is part of the " + wk.rule + " weekend in " + (label || Tz.countryDisplayName(wk.country));
      box.appendChild(w);
    }
    return { phase: phase, weekend: wk };
  }

  function tick() {
    const realNow = Date.now();
    const wall = Tz.getWallParts(userZone, realNow);
    els.youHeading.textContent = Tz.placeLabel(userZone, realNow);
    els.youTime.textContent = Tz.formatTimeShort(wall, state.hour12);
    els.youMeta.textContent = Tz.formatDate(wall) + " · " + wall.offsetLabel;

    const now = compareInstant();
    const cards = els.clockGrid.querySelectorAll(".clock-card");
    for (let i = 0; i < cards.length; i++) {
      const tz = cards[i].getAttribute("data-tz");
      const w = Tz.getWallParts(tz, now);
      const tagBox = cards[i].querySelector(".card-phase");
      if (tagBox) {
        const info = fillTags(tagBox, tz, w, cards[i].getAttribute("data-label"));
        cards[i].setAttribute("data-phase", info.phase);
      }
      cards[i].classList.toggle("scrubbing", !!state.scrubMin);
      const timeEl = cards[i].querySelector(".card-time");
      const dateEl = cards[i].querySelector(".card-date");
      const offEl = cards[i].querySelector(".card-off");
      if (timeEl) timeEl.textContent = Tz.formatTimeShort(w, state.hour12);
      if (dateEl) dateEl.textContent = Tz.formatDate(w);
      if (offEl) {
        offEl.textContent = Tz.placeLabel(tz, now);
      }
    }
    renderScrub();
  }

  // ---- Scrub through time (Compare cities) ----

  function renderScrub() {
    if (!els.scrub) return;
    const base = compareInstant() - state.scrubMin * Tz.MINUTE;
    const shown = base + state.scrubMin * Tz.MINUTE;
    const youWall = Tz.getWallParts(userZone, shown);
    const offsetText = Tz.formatScrubOffset(state.scrubMin);
    const when = Tz.formatShortDate(youWall) + ", " + Tz.formatTimeShort(youWall, state.hour12) + " your time";
    els.scrubOut.textContent = state.scrubMin ? offsetText + " · " + when : "Now · " + when;
    els.scrub.setAttribute("aria-valuetext", offsetText + ", " + when);
    if (String(els.scrub.value) !== String(state.scrubMin)) els.scrub.value = String(state.scrubMin);
    els.scrubReset.disabled = !state.scrubMin;
    // Day/night shading for your own zone across the slider's 48 hours.
    const start = base - 24 * Tz.HOUR;
    const end = base + 24 * Tz.HOUR;
    const key = userZone + "|" + start;
    if (els.scrubShade.getAttribute("data-key") !== key) {
      els.scrubShade.setAttribute("data-key", key);
      els.scrubShade.innerHTML = "";
      Tz.daylightSegments(userZone, start, end, 15).forEach(function (seg) {
        const span = document.createElement("span");
        span.className = "phase-" + seg.phase;
        span.style.left = ((seg.start - start) / (end - start) * 100) + "%";
        span.style.width = ((seg.end - seg.start) / (end - start) * 100) + "%";
        els.scrubShade.appendChild(span);
      });
      const mark = document.createElement("span");
      mark.className = "now-mark";
      mark.style.left = "50%";
      els.scrubShade.appendChild(mark);
    }
  }

  let scrubFrame = 0;
  function setScrub(minutes) {
    state.scrubMin = Math.max(-1440, Math.min(1440, Math.round(Number(minutes) / 15) * 15 || 0));
    if (scrubFrame) return;
    scrubFrame = requestAnimationFrame(function () {
      scrubFrame = 0;
      tick();
    });
  }

  function compareRows() {
    const t = compareInstant();
    return state.zones.map(function (entry) {
      return { label: entryLabel(entry), wall: Tz.getWallParts(entry.tz, t) };
    });
  }

  // ---- Clipboard ----

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // fall through to the textarea fallback
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function flash(el, text) {
    el.textContent = text;
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(function () {
      if (el.textContent === text) el.textContent = "";
    }, 2500);
  }

  function selectText(el) {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      // nothing else to do
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFavs() {
    els.favs.innerHTML = "";
    state.favs.forEach(function (entry) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = entryLabel(entry);
      btn.setAttribute("aria-label", "Add " + entryLabel(entry) + " to the grid");
      btn.addEventListener("click", function () { addZone(entry.tz, entry.label); });
      els.favs.appendChild(btn);
    });
  }

  function renderGrid() {
    els.clockGrid.innerHTML = "";
    if (!state.zones.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Add a city to compare.";
      els.clockGrid.appendChild(p);
      renderDstNotes();
      return;
    }
    const warnings = Tz.dstWarnings(state.zones.map(function (e) { return e.tz; }), Date.now(), 30, userZone);
    const warnByZone = {};
    warnings.forEach(function (w) { warnByZone[w.timeZone] = w; });

    state.zones.forEach(function (entry) {
      const tz = entry.tz;
      const label = entryLabel(entry);
      const card = document.createElement("article");
      card.className = "clock-card" + (Tz.sameZone(tz, userZone) ? " you-card" : "");
      card.setAttribute("data-tz", tz);
      card.setAttribute("data-label", label);

      const top = document.createElement("div");
      top.className = "card-top";

      const name = document.createElement("div");
      name.className = "card-name";
      name.textContent = label;
      if (Tz.sameZone(tz, userZone)) {
        const badge = document.createElement("span");
        badge.className = "you-badge";
        badge.textContent = "You";
        name.appendChild(document.createTextNode(" "));
        name.appendChild(badge);
      }

      const favBtn = document.createElement("button");
      favBtn.type = "button";
      favBtn.className = "icon-btn";
      favBtn.innerHTML = starSvg;
      const faved = state.favs.some(function (f) { return sameEntry(f, entry); });
      favBtn.setAttribute("aria-pressed", faved ? "true" : "false");
      favBtn.setAttribute("aria-label", (faved ? "Remove " : "Save ") + label + " as a favourite");
      favBtn.addEventListener("click", function () { toggleFav(entry); });

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "icon-btn";
      rm.innerHTML = closeSvg;
      rm.setAttribute("aria-label", "Remove " + label);
      rm.addEventListener("click", function () { removeZone(entry); });

      top.appendChild(name);
      top.appendChild(favBtn);
      top.appendChild(rm);

      const time = document.createElement("div");
      time.className = "card-time";
      const date = document.createElement("div");
      date.className = "card-date";
      const off = document.createElement("div");
      off.className = "card-off";

      card.appendChild(top);
      card.appendChild(time);
      card.appendChild(date);
      card.appendChild(off);
      const phaseBox = document.createElement("div");
      phaseBox.className = "tags card-phase";
      card.appendChild(phaseBox);
      if (warnByZone[tz]) {
        const w = document.createElement("p");
        w.className = "card-warn";
        w.textContent = warnByZone[tz].text;
        card.appendChild(w);
      }
      els.clockGrid.appendChild(card);
    });
    renderDstNotes();
    tick();
  }

  function renderDstNotes() {
    els.dstNotes.innerHTML = "";
    const zones = unique([userZone].concat(state.zones));
    const warnings = Tz.dstWarnings(zones, Date.now(), 30, userZone);
    const seen = {};
    warnings.forEach(function (w) {
      if (seen[w.text]) return;
      seen[w.text] = true;
      const div = document.createElement("div");
      div.className = "warn";
      div.textContent = w.text;
      els.dstNotes.appendChild(div);
    });
  }

  function addZone(tz, label) {
    const entry = asEntry({ tz: tz, label: label });
    if (!entry) return;
    const exists = state.zones.some(function (z) { return sameEntry(z, entry); });
    if (!exists) {
      state.zones.push(entry);
      writeStore();
      syncHash();
      renderGrid();
      renderMeeting();
    } else {
      const card = els.clockGrid.querySelector('[data-tz="' + cssEscape(entry.tz) + '"][data-label="' + cssEscape(entry.label) + '"]') ||
        els.clockGrid.querySelector('[data-tz="' + cssEscape(entry.tz) + '"]');
      if (card) card.scrollIntoView({ block: "nearest" });
    }
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function removeZone(entry) {
    state.zones = state.zones.filter(function (z) { return !sameEntry(z, entry); });
    writeStore();
    syncHash();
    renderGrid();
    renderMeeting();
  }

  function toggleFav(entry) {
    const i = state.favs.findIndex(function (z) { return sameEntry(z, entry); });
    if (i === -1) state.favs.push({ tz: entry.tz, label: entryLabel(entry) });
    else state.favs.splice(i, 1);
    writeStore();
    renderFavs();
    renderGrid();
  }

  function bindCombo(input, list, onPick, opts) {
    opts = opts || {};
    let items = [];
    let active = -1;
    let blurTimer = 0;

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      active = -1;
    }

    function open(rows) {
      items = rows.slice(0, 12);
      list.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("li");
        empty.className = "combo-empty";
        empty.textContent = "No matching timezones";
        list.appendChild(empty);
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        input.removeAttribute("aria-activedescendant");
        active = -1;
        return;
      }
      items.forEach(function (row, i) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("role", "option");
        btn.id = list.id + "-opt-" + i;
        btn.setAttribute("aria-selected", "false");
        const label = row.title || row.name;
        const match = row.matchLabel ? "<small class=\"combo-match\">" + escapeHtml(row.matchLabel) + "</small>" : "";
        btn.innerHTML = escapeHtml(label) + match + "<small class=\"combo-id\">" + escapeHtml(row.timeZone) + "</small>";
        btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
        btn.addEventListener("click", function () { pick(row); });
        li.appendChild(btn);
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      setActive(0);
    }

    function setActive(index) {
      const buttons = list.querySelectorAll('[role="option"]');
      active = index;
      for (let i = 0; i < buttons.length; i++) {
        const on = i === index;
        buttons[i].setAttribute("aria-selected", on ? "true" : "false");
        if (on) {
          input.setAttribute("aria-activedescendant", buttons[i].id);
          buttons[i].scrollIntoView({ block: "nearest" });
        }
      }
    }

    function pick(row) {
      onPick(row.timeZone, row);
      if (opts.keepValue) input.value = row.displayLabel || row.title || row.name;
      else input.value = "";
      close();
    }

    function refresh() {
      open(Tz.searchTimeZones(input.value));
    }

    input.addEventListener("input", refresh);
    input.addEventListener("focus", function () {
      clearTimeout(blurTimer);
      refresh();
    });
    input.addEventListener("blur", function () {
      blurTimer = setTimeout(close, 150);
    });
    input.addEventListener("keydown", function (e) {
      if (list.hidden && (e.key === "ArrowDown" || e.key === "Enter")) {
        refresh();
        if (e.key === "Enter") e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(Math.min(items.length - 1, active + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(0, active - 1));
      } else if (e.key === "Enter") {
        if (!list.hidden && items[active]) {
          e.preventDefault();
          pick(items[active]);
        }
      } else if (e.key === "Escape") {
        close();
      }
    });
  }

  function renderTargets() {
    els.toTargets.innerHTML = "";
    state.to.forEach(function (entry) {
      const chip = document.createElement("span");
      chip.className = "target-chip";
      chip.appendChild(document.createTextNode(entryLabel(entry)));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Remove " + entryLabel(entry));
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        state.to = state.to.filter(function (z) { return !sameEntry(z, entry); });
        syncHash();
        renderTargets();
        renderConverter();
        renderPerCityRows();
        renderMeeting();
      });
      chip.appendChild(btn);
      els.toTargets.appendChild(chip);
    });
  }

  function addTarget(tz, label) {
    const entry = asEntry({ tz: tz, label: label });
    if (!entry) return;
    if (!state.to.some(function (z) { return sameEntry(z, entry); })) state.to.push(entry);
    syncHash();
    renderTargets();
    renderConverter();
    renderPerCityRows();
    renderMeeting();
  }

  function fillForm() {
    els.convDate.value = state.date;
    els.convTime.value = state.time;
    const fromName = state.fromLabel || Tz.friendlyName(state.from);
    document.getElementById("conv-from").value = fromName;
    els.meetDate.value = state.meetingDate;
    els.workStart.value = state.workStart;
    els.workEnd.value = state.workEnd;
    els.perCityHours.checked = !!state.perCityHours;
    renderTargets();
    renderPerCityRows();
  }

  function partsFromForm() {
    const d = Tz.parseIsoDate(state.date);
    const t = Tz.parseIsoTime(state.time);
    if (!d || !t) return null;
    return {
      year: d.year,
      month: d.month,
      day: d.day,
      hour: t.hour,
      minute: t.minute,
      second: t.second || 0,
    };
  }

  function hideConverterExtras() {
    lastConv = null;
    els.convSummary.hidden = true;
    els.convTools.hidden = true;
  }

  function renderConverter() {
    const box = els.convResults;
    box.innerHTML = "";
    const parts = partsFromForm();
    if (!parts || !state.from || !state.to.length) {
      hideConverterExtras();
      updatePickMarker();
      return;
    }
    const toZones = state.to.map(function (e) { return e.tz; });
    const fromLabel = state.fromLabel || Tz.shortName(state.from);
    let result;
    try {
      result = Tz.convertMany(state.from, toZones, parts);
    } catch (err) {
      hideConverterExtras();
      const errBox = document.createElement("div");
      errBox.className = "form-errors";
      errBox.textContent = "That date and time could not be converted.";
      box.appendChild(errBox);
      updatePickMarker();
      return;
    }
    const rows = [{ tz: state.from, label: fromLabel, wall: result.from.wall }].concat(
      result.results.map(function (row, i) {
        return {
          tz: row.timeZone,
          label: (state.to[i] && entryLabel(state.to[i])) || Tz.shortName(row.timeZone),
          wall: row.wall,
        };
      })
    );
    lastConv = { instant: result.instant, rows: rows };
    renderConverterExtras();

    if (result.note) {
      const note = document.createElement("div");
      note.className = "warn";
      let text = result.note;
      if (result.kind === "gap") {
        text += " Entered " + Tz.formatTimeShort({
          hour: result.from.wanted.hour,
          minute: result.from.wanted.minute,
        }, state.hour12) + ", using " + Tz.formatTimeShort(result.from.wall, state.hour12) + " instead.";
      }
      note.textContent = text;
      box.appendChild(note);
    }

    if (result.kind === "ambiguous" && result.ambiguousWalls) {
      const alt = document.createElement("div");
      alt.className = "notice";
      const ul = document.createElement("ul");
      ul.className = "alt-list";
      result.ambiguousWalls.forEach(function (row, i) {
        const li = document.createElement("li");
        const label = i === 0 ? "Earlier" : "Later";
        const bits = row.targets.map(function (t) {
          return labelForZone(t.timeZone, state.to) + " " + Tz.formatTimeShort(t.wall, state.hour12) +
            " (" + t.wall.offsetLabel + ")";
        });
        li.textContent = label + " (" + row.from.offsetLabel + "): " + bits.join("; ");
        ul.appendChild(li);
      });
      alt.appendChild(document.createTextNode("Both occurrences:"));
      alt.appendChild(ul);
      box.appendChild(alt);
    }

    result.results.forEach(function (row, i) {
      const toLabel = (state.to[i] && entryLabel(state.to[i])) || Tz.shortName(row.timeZone);
      const card = document.createElement("div");
      card.className = "result-card";
      const where = document.createElement("div");
      where.className = "where";
      where.textContent = toLabel;
      const when = document.createElement("p");
      when.className = "when";
      when.textContent = Tz.formatTimeShort(row.wall, state.hour12);
      const date = document.createElement("p");
      date.innerHTML = escapeHtml(Tz.formatDate(row.wall)) +
        ' · <span class="shift">' + escapeHtml(row.dayShift) + "</span>";
      const gap = document.createElement("p");
      gap.textContent = gapLabel(row.gap, fromLabel, toLabel) + " at this date.";
      card.appendChild(where);
      card.appendChild(when);
      card.appendChild(date);
      card.appendChild(gap);
      const tags = document.createElement("div");
      tags.className = "tags";
      const info = fillTags(tags, row.timeZone, row.wall, toLabel);
      card.appendChild(tags);
      if (info.weekend.isWeekend) {
        const wk = document.createElement("p");
        wk.className = "weekend-note";
        wk.textContent = info.weekend.dayName + " is a weekend day in " + toLabel +
          " (" + info.weekend.rule + " weekend).";
        card.appendChild(wk);
      }
      if (row.gapDiffersFromToday) {
        const w = document.createElement("p");
        w.className = "shift";
        w.textContent = "Today the gap is different: " + gapLabel(row.gapToday, fromLabel, toLabel) + ".";
        card.appendChild(w);
      }
      box.appendChild(card);
    });
  }

  function shareText() {
    return lastConv ? Tz.formatShareText(lastConv.rows, state.hour12) : "";
  }

  function calendarDetails() {
    const lines = lastConv.rows.map(function (r) {
      return r.label + ": " + Tz.formatShortDate(r.wall) + ", " + Tz.formatTimeShort(r.wall, state.hour12) +
        " (" + r.wall.offsetLabel + ")";
    });
    lines.push("", "Planned with somoclox: " + shareUrl());
    return lines.join("\n");
  }

  function calendarTitle() {
    return "Meeting (somoclox)";
  }

  function renderConverterExtras() {
    if (!lastConv) return;
    const from = lastConv.rows[0];
    els.convWhen.textContent = Tz.formatShortDate(from.wall) + ", " + Tz.formatTimeShort(from.wall, state.hour12) +
      " in " + from.label;
    els.convSummary.hidden = false;
    updateCountdown();
    els.convTools.hidden = false;
    els.sharePreview.textContent = shareText();
    if (String(els.duration.value) !== String(state.duration)) els.duration.value = String(state.duration);
    els.gcalLink.href = Tz.googleCalendarUrl({
      start: lastConv.instant,
      durationMin: state.duration,
      title: calendarTitle(),
      description: calendarDetails(),
    });
  }

  function updateCountdown() {
    if (!lastConv) return;
    const c = Tz.formatCountdown(lastConv.instant, Date.now());
    if (els.countdown.textContent !== c.text) els.countdown.textContent = c.text;
    els.countdown.setAttribute("data-state", c.state);
  }

  function downloadIcs() {
    if (!lastConv) return;
    const ics = Tz.buildIcs({
      start: lastConv.instant,
      durationMin: state.duration,
      title: calendarTitle(),
      description: calendarDetails(),
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "somoclox-meeting-" + Tz.icsDateUtc(lastConv.instant).slice(0, 13) + ".ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    flash(els.toolStatus, "Calendar file downloaded. Open it to add the meeting.");
  }

  async function copyConverterText() {
    const text = shareText();
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) flash(els.toolStatus, "Copied");
    else {
      selectText(els.sharePreview);
      flash(els.toolStatus, "Copying was blocked. The text above is selected, so press Ctrl+C or Cmd+C.");
    }
  }

  async function copyCompareText() {
    const text = Tz.formatShareText(compareRows(), state.hour12);
    if (!text) return;
    const ok = await copyToClipboard(text);
    flash(els.compareStatus, ok ? "Copied" : "Copying was blocked: " + text);
  }

  // ---- Picking a time on the meeting bar ----

  function minutesLabel(t) {
    const wall = Tz.getWallParts(state.from, t);
    return Tz.formatTimeShort(wall, state.hour12) + " " + (state.fromLabel || Tz.shortName(state.from));
  }

  function updatePickMarker() {
    const chart = els.barChart;
    if (!chart) return;
    const old = els.hourGrid && els.hourGrid.querySelector(".pick-line");
    const frac = (meetBounds && lastConv) ? Tz.instantFraction(lastConv.instant, meetBounds.dayStart, meetBounds.dayEnd) : null;
    if (meetBounds) {
      chart.setAttribute("aria-valuemax", String(Math.round((meetBounds.dayEnd - meetBounds.dayStart) / Tz.MINUTE)));
    }
    if (frac == null) {
      if (old) old.remove();
      chart.setAttribute("aria-valuenow", "0");
      chart.setAttribute("aria-valuetext", "No time picked on this date");
      return;
    }
    let line = old;
    if (!line) {
      line = document.createElement("span");
      line.className = "pick-line";
      els.hourGrid.appendChild(line);
    }
    line.style.left = (frac * 100) + "%";
    chart.setAttribute("aria-valuenow", String(Math.round((lastConv.instant - meetBounds.dayStart) / Tz.MINUTE)));
    chart.setAttribute("aria-valuetext", minutesLabel(lastConv.instant));
  }

  function applyPickedInstant(t) {
    const wall = Tz.getWallParts(state.from, t);
    state.date = Tz.isoDate(wall);
    state.time = Tz.pad2(wall.hour) + ":" + Tz.pad2(wall.minute);
    els.convDate.value = state.date;
    els.convTime.value = state.time;
    state.meetDateManual = !!(state.meetingDate && state.meetingDate !== state.date);
    syncHash();
    renderConverter();
    updatePickMarker();
  }

  function barFraction(clientX) {
    const r = els.hourGrid.getBoundingClientRect();
    if (!r.width) return null;
    return (clientX - r.left) / r.width;
  }

  function bindBarPicking() {
    const chart = els.barChart;
    if (!chart) return;
    let dragging = false;
    let pending = null;
    let frame = 0;

    function pickAt(clientX) {
      if (!meetBounds) return;
      const f = barFraction(clientX);
      if (f == null) return;
      pending = f;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        if (pending == null || !meetBounds) return;
        applyPickedInstant(Tz.pickOnBar(meetBounds.dayStart, meetBounds.dayEnd, pending, 15));
        pending = null;
      });
    }

    chart.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || !meetBounds) return;
      const r = els.hourGrid.getBoundingClientRect();
      if (e.clientX < r.left - 6 || e.clientX > r.right + 6) return;
      dragging = true;
      try { chart.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pickAt(e.clientX);
    });
    chart.addEventListener("pointermove", function (e) {
      if (dragging) pickAt(e.clientX);
    });
    function stop(e) {
      if (!dragging) return;
      dragging = false;
      try { chart.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    chart.addEventListener("pointerup", stop);
    chart.addEventListener("pointercancel", stop);

    chart.addEventListener("keydown", function (e) {
      if (!meetBounds) return;
      const step = 15 * Tz.MINUTE;
      const len = meetBounds.dayEnd - meetBounds.dayStart;
      let current = lastConv && Tz.instantFraction(lastConv.instant, meetBounds.dayStart, meetBounds.dayEnd) != null
        ? lastConv.instant
        : meetBounds.dayStart + 9 * Tz.HOUR;
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + (e.shiftKey ? 4 : 1) * step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current - (e.shiftKey ? 4 : 1) * step;
      else if (e.key === "PageUp") next = current + 4 * step;
      else if (e.key === "PageDown") next = current - 4 * step;
      else if (e.key === "Home") next = meetBounds.dayStart;
      else if (e.key === "End") next = meetBounds.dayEnd - step;
      if (next == null) return;
      e.preventDefault();
      applyPickedInstant(Tz.pickOnBar(meetBounds.dayStart, meetBounds.dayEnd, (next - meetBounds.dayStart) / len, 15));
    });
  }

  function addDays(year, month, day, delta) {
    const dt = new Date(Date.UTC(year, month - 1, day + delta));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  function renderPerCityRows() {
    const people = meetingPeople();
    const on = !!state.perCityHours;
    els.perCityHours.checked = on;
    els.perCityRows.hidden = !on;
    if (els.sharedStartField) els.sharedStartField.hidden = on;
    if (els.sharedEndField) els.sharedEndField.hidden = on;
    if (els.meetGrid) {
      if (on) els.meetGrid.classList.add("per-city-on");
      else els.meetGrid.classList.remove("per-city-on");
    }
    els.perCityRows.innerHTML = "";
    if (!on) return;
    people.forEach(function (entry, index) {
      const hours = ensureHours(entry);
      const row = document.createElement("div");
      row.className = "hours-row";
      const name = document.createElement("div");
      name.className = "city-label";
      name.textContent = entryLabel(entry);
      function field(idPrefix, labelText, value, key) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lab = document.createElement("label");
        const id = idPrefix + "-" + index;
        lab.setAttribute("for", id);
        lab.textContent = labelText;
        const input = document.createElement("input");
        input.id = id;
        input.type = "time";
        input.step = "60";
        input.value = value;
        input.addEventListener("change", function () { onCityHoursChange(entry, key, input.value); });
        input.addEventListener("input", function () { onCityHoursChange(entry, key, input.value); });
        wrap.appendChild(lab);
        wrap.appendChild(input);
        return wrap;
      }
      row.appendChild(name);
      row.appendChild(field("city-start", "Start", hours.start, "start"));
      row.appendChild(field("city-end", "End", hours.end, "end"));
      els.perCityRows.appendChild(row);
    });
  }

  function onCityHoursChange(entry, key, value) {
    const hours = ensureHours(entry);
    hours[key] = value || (key === "start" ? "09:00" : "18:00");
    state.workHours[hoursKey(entry)] = hours;
    writeStore();
    syncHash();
    renderMeeting();
  }

  function setPerCityHours(on) {
    state.perCityHours = !!on;
    if (state.perCityHours) {
      meetingPeople().forEach(function (entry) { ensureHours(entry); });
    }
    writeStore();
    syncHash();
    renderPerCityRows();
    renderMeeting();
  }

  function formatAxisHour(hour, hour12) {
    if (!hour12) return hour === 24 ? "24" : Tz.pad2(hour);
    const hour24 = hour === 24 ? 0 : hour;
    const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const suffix = (hour24 >= 12 && hour !== 24) ? "p" : "a";
    return h + suffix;
  }

  function hourOffset(hour) {
    return (hour / 24 * 100) + "%";
  }

  function renderHourAxis() {
    const axis = els.barLabel;
    const grid = els.hourGrid;
    if (axis) axis.innerHTML = "";
    if (grid) grid.innerHTML = "";
    for (let i = 0; i <= 24; i++) {
      const left = hourOffset(i);
      if (grid) {
        const tick = document.createElement("span");
        tick.className = "hour-tick" + (i % 3 === 0 ? " hour-tick-major" : "");
        tick.style.left = left;
        tick.setAttribute("data-hour", String(i));
        grid.appendChild(tick);
      }
      if (axis && i % 3 === 0) {
        const lab = document.createElement("span");
        lab.className = "axis-label" + (i % 6 === 0 ? " axis-label-coarse" : " axis-label-fine");
        lab.style.left = left;
        lab.setAttribute("data-hour", String(i));
        lab.textContent = formatAxisHour(i, state.hour12);
        axis.appendChild(lab);
      }
    }
  }

  function formatWindowRange(startWall, endWall) {
    let text = Tz.formatTimeShort(startWall, state.hour12) + "–" + Tz.formatTimeShort(endWall, state.hour12);
    const diff = Tz.calendarDiffDays(startWall, endWall);
    if (diff > 0) text += " next day";
    else if (diff < 0) text += " previous day";
    return text;
  }

  function renderMeeting() {
    const date = Tz.parseIsoDate(state.meetingDate);
    const people = meetingPeople();
    els.meetBar.innerHTML = "";
    els.meetWindows.innerHTML = "";
    if (els.barLabel) els.barLabel.innerHTML = "";
    if (els.hourGrid) els.hourGrid.innerHTML = "";
    els.barCaption.textContent = "";
    els.meetCities.textContent = "";
    meetBounds = null;
    if (els.meetBarWrap) els.meetBarWrap.hidden = false;

    if (!state.to.length) {
      if (els.meetBarWrap) els.meetBarWrap.hidden = true;
      const prompt = document.createElement("div");
      prompt.className = "notice";
      prompt.textContent = "Add a To timezone above to find a shared time.";
      els.meetWindows.appendChild(prompt);
      return;
    }
    if (!date || !state.from) return;

    const fromLabel = state.fromLabel || Tz.shortName(state.from);
    els.meetCities.innerHTML = "Checking <strong>" + people.map(function (e) {
      return escapeHtml(entryLabel(e));
    }).join("</strong>, <strong>") + "</strong>";

    const overlap = (function () {
      try {
        return Tz.findMeetingOverlap({
          zones: people,
          axisZone: state.from,
          date: date,
          workStart: state.workStart,
          workEnd: state.workEnd,
          hours: people.map(function (entry) { return hoursFor(entry); }),
        });
      } catch (err) {
        return null;
      }
    })();

    if (!overlap) {
      els.barCaption.textContent = "Those working hours could not be applied to this date.";
      return;
    }
    meetBounds = { dayStart: overlap.dayStart, dayEnd: overlap.dayEnd };

    const dayStart = overlap.dayStart;
    const dayEnd = overlap.dayEnd;
    const length = dayEnd - dayStart;
    renderHourAxis();
    els.barCaption.textContent = "Times shown in " + fromLabel + " time";

    function addLane(name, intervals, overlapLane, zone) {
      const lane = document.createElement("div");
      lane.className = "lane" + (overlapLane ? " overlap" : "");
      const labelEl = document.createElement("div");
      labelEl.className = "lane-name";
      labelEl.textContent = name;
      const track = document.createElement("div");
      track.className = "lane-track";
      if (zone && length) {
        Tz.daylightSegments(zone, dayStart, dayEnd, 15).forEach(function (seg) {
          const shade = document.createElement("div");
          shade.className = "lane-shade phase-" + seg.phase;
          shade.style.left = ((seg.start - dayStart) / length * 100) + "%";
          shade.style.width = ((seg.end - seg.start) / length * 100) + "%";
          track.appendChild(shade);
        });
      }
      (intervals || []).forEach(function (iv) {
        const clipped = Tz.clipInterval(iv, dayStart, dayEnd);
        if (!clipped || !length) return;
        const seg = document.createElement("div");
        seg.className = "lane-seg";
        const left = ((clipped.start - dayStart) / length) * 100;
        const width = ((clipped.end - clipped.start) / length) * 100;
        seg.style.left = Math.max(0, left) + "%";
        seg.style.width = Math.max(0.4, width) + "%";
        track.appendChild(seg);
      });
      lane.appendChild(labelEl);
      lane.appendChild(track);
      els.meetBar.appendChild(lane);
    }

    overlap.lanes.forEach(function (lane) {
      addLane(lane.label, lane.intervals, false, lane.timeZone);
    });
    addLane("Overlap", overlap.intervals, true);
    updatePickMarker();

    if (overlap.none) {
      const none = document.createElement("div");
      none.className = "notice";
      let text = "There is no overlapping working hour on this date for " +
        people.map(function (e) { return entryLabel(e); }).join(" and ") + ".";
      if (overlap.nearMiss && overlap.nearMiss.text) {
        text += " " + overlap.nearMiss.text;
      }
      none.textContent = text;
      els.meetWindows.appendChild(none);
      appendWeekendNote(els.meetWindows, people, dayStart + length / 2);
      return;
    }

    overlap.formatted.forEach(function (win, index) {
      const card = document.createElement("div");
      card.className = "window-card";
      const h = document.createElement("h3");
      h.textContent = (overlap.formatted.length > 1 ? "Window " + (index + 1) + " · " : "Best overlap · ") +
        formatDuration(win.durationMin);
      const p = document.createElement("p");
      p.className = "overlap-line";
      p.textContent = win.inZones.map(function (z) {
        const label = z.label || labelForZone(z.timeZone, people);
        return label + " " + formatWindowRange(z.start, z.end);
      }).join(" · ");
      card.appendChild(h);
      card.appendChild(p);
      appendWeekendNote(card, people, win.start);
      els.meetWindows.appendChild(card);
    });
  }

  function appendWeekendNote(box, people, instant) {
    const notes = [];
    people.forEach(function (entry) {
      const wall = Tz.getWallParts(entry.tz, instant);
      const wk = Tz.weekendInfo(entry.tz, wall);
      if (wk.isWeekend) notes.push(wk.dayName + " is a weekend day in " + entryLabel(entry) + " (" + wk.rule + ")");
    });
    if (!notes.length) return;
    const p = document.createElement("p");
    p.className = "window-weekend";
    p.textContent = "Heads up: " + notes.join("; ") + ".";
    box.appendChild(p);
  }

  function dummyWall(hour, minute) {
    return { hour: hour, minute: minute };
  }

  function formatDuration(minutes) {
    return Tz.formatDuration(minutes);
  }

  async function copyLink() {
    const url = shareUrl();
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(ta);
    }
    els.copyStatus.textContent = ok ? "Link copied." : "Copy the address from the box: " + url;
    setTimeout(function () {
      if (els.copyStatus.textContent.indexOf("Link copied") === 0) els.copyStatus.textContent = "";
    }, 2500);
  }

  function onFormChange(ev) {
    const src = ev && ev.target && ev.target.id;
    const prevDate = state.date;
    state.date = els.convDate.value;
    state.time = els.convTime.value;
    if (src === "meet-date") {
      state.meetingDate = els.meetDate.value;
      state.meetDateManual = !!(state.meetingDate && state.meetingDate !== state.date);
    } else if (src === "conv-date") {
      if (!state.meetDateManual || state.meetingDate === prevDate) {
        state.meetDateManual = false;
        state.meetingDate = state.date;
        els.meetDate.value = state.meetingDate;
      }
    } else if (!state.meetDateManual) {
      state.meetingDate = state.date;
      if (els.meetDate.value !== state.meetingDate) els.meetDate.value = state.meetingDate;
    }
    state.workStart = els.workStart.value || "09:00";
    state.workEnd = els.workEnd.value || "18:00";
    writeStore();
    syncHash();
    renderConverter();
    renderMeeting();
  }

  function bind() {
    els.fmt24.addEventListener("click", function () { setHour12(false); });
    els.fmt12.addEventListener("click", function () { setHour12(true); });
    els.copyLink.addEventListener("click", function () { copyLink(); });
    ["conv-date", "conv-time", "meet-date", "work-start", "work-end"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", onFormChange);
      document.getElementById(id).addEventListener("input", onFormChange);
    });
    els.perCityHours.addEventListener("change", function () {
      setPerCityHours(els.perCityHours.checked);
    });
    els.copyText.addEventListener("click", function () { copyConverterText(); });
    els.addIcs.addEventListener("click", function () { downloadIcs(); });
    els.duration.addEventListener("change", function () {
      state.duration = Tz.parseDuration(els.duration.value);
      writeStore();
      syncHash();
      renderConverterExtras();
    });
    els.gcalLink.addEventListener("click", function (e) {
      if (!lastConv) e.preventDefault();
    });
    els.scrub.addEventListener("input", function () { setScrub(els.scrub.value); });
    els.scrub.addEventListener("change", function () { setScrub(els.scrub.value); });
    els.scrubReset.addEventListener("click", function () {
      setScrub(0);
      els.scrub.value = "0";
    });
    els.copyCompare.addEventListener("click", function () { copyCompareText(); });
    bindBarPicking();
    setInterval(updateCountdown, 15000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { updateCountdown(); tick(); }
    });

    bindCombo(document.getElementById("zone-search"), document.getElementById("zone-list"), function (tz, row) {
      addZone(tz, row && row.displayLabel);
    });
    bindCombo(document.getElementById("conv-from"), document.getElementById("from-list"), function (tz, row) {
      const entry = asEntry({ tz: tz, label: row && row.displayLabel });
      if (!entry) return;
      state.from = entry.tz;
      state.fromLabel = entry.label;
      document.getElementById("conv-from").value = entry.label;
      syncHash();
      renderConverter();
      renderPerCityRows();
      renderMeeting();
    }, { keepValue: true });
    bindCombo(document.getElementById("conv-to"), document.getElementById("to-list"), function (tz, row) {
      addTarget(tz, row && row.displayLabel);
    });

    window.addEventListener("hashchange", function () {
      applyHashAndStore();
      fillForm();
      setHour12(state.hour12);
      renderFavs();
      renderGrid();
      renderConverter();
      renderMeeting();
    });
  }

  applyHashAndStore();
  bind();
  fillForm();
  setHour12(state.hour12);
  renderFavs();
  renderGrid();
  renderConverter();
  renderMeeting();
  scheduleTick();
  setTimeout(function () {
    try { Tz.searchTimeZones(" "); } catch (err) {}
  }, 0);
})();

