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
    meetBar: document.getElementById("meet-bar"),
    barLabel: document.getElementById("bar-label"),
    barCaption: document.getElementById("bar-caption"),
    meetWindows: document.getElementById("meet-windows"),
  };

  const allZones = Tz.listTimeZones();
  const userZone = (function () {
    const tz = Tz.resolveZone(Tz.detectTimeZone());
    return allZones.indexOf(tz) !== -1 || isKnownZone(tz) ? tz : "UTC";
  })();

  const state = {
    zones: Tz.DEFAULT_CITIES.map(function (c) { return Tz.resolveZone(c.timeZone); }),
    favs: [],
    hour12: false,
    from: userZone,
    to: [],
    date: "",
    time: "",
    meetingDate: "",
    workStart: "09:00",
    workEnd: "18:00",
  };

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
      const tz = Tz.resolveZone(list[i]);
      if (!tz) continue;
      let seen = false;
      for (let j = 0; j < out.length; j++) {
        if (Tz.sameZone(out[j], tz)) { seen = true; break; }
      }
      if (!seen) out.push(tz);
    }
    return out;
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
        state.zones = stored.zones.map(Tz.resolveZone).filter(isKnownZone);
      }
      if (Array.isArray(stored.favs)) state.favs = stored.favs.map(Tz.resolveZone).filter(isKnownZone);
      if (typeof stored.hour12 === "boolean") state.hour12 = stored.hour12;
      if (stored.workStart) state.workStart = stored.workStart;
      if (stored.workEnd) state.workEnd = stored.workEnd;
    }

    const hash = Tz.decodeState(location.hash || location.search);
    const hasHash = !!(location.hash && location.hash.length > 1) ||
      !!(location.search && /(?:^|[?&])(z|from|d|t|h)=/.test(location.search));
    if (hasHash) {
      if (hash.zones.length) state.zones = hash.zones.map(Tz.resolveZone).filter(isKnownZone);
      if (hash.from && isKnownZone(hash.from)) state.from = Tz.resolveZone(hash.from);
      if (hash.to.length) state.to = hash.to.map(Tz.resolveZone).filter(isKnownZone);
      if (hash.date) state.date = hash.date;
      if (hash.time) state.time = hash.time;
      if (hash.meetingDate) state.meetingDate = hash.meetingDate;
      if (location.hash.indexOf("h=") !== -1 || location.search.indexOf("h=") !== -1) {
        state.hour12 = hash.hour12;
      }
      if (hash.workStart) state.workStart = hash.workStart;
      if (hash.workEnd) state.workEnd = hash.workEnd;
    }

    state.zones = unique(state.zones);
    state.favs = unique(state.favs);
    if (!state.to.length) state.to = [defaultToZone()];
    if (state.to.indexOf(state.from) !== -1 && state.to.length === 1) {
      // Fine to convert a zone to itself; leave it.
    }
    if (!state.date) state.date = todayInZone(userZone);
    if (!state.time) state.time = currentTimeInZone(state.from);
    if (!state.meetingDate) state.meetingDate = state.date;
  }

  function currentShareState() {
    return {
      zones: state.zones,
      from: state.from,
      to: state.to,
      date: state.date,
      time: state.time,
      meetingDate: state.meetingDate,
      hour12: state.hour12,
      workStart: state.workStart,
      workEnd: state.workEnd,
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

  function dstPhrase(info) {
    if (!info.hasDST) return "";
    return info.inDST ? "Daylight time" : "Standard time";
  }

  function metaLine(wall, info) {
    const bits = [Tz.formatDate(wall), wall.offsetLabel];
    const dst = dstPhrase(info);
    if (dst) bits.push(dst);
    return bits;
  }

  function tick() {
    const now = Date.now();
    const wall = Tz.getWallParts(userZone, now);
    const info = Tz.getDSTInfo(userZone, now);
    els.youHeading.textContent = Tz.shortName(userZone);
    els.youTime.textContent = Tz.formatTime(wall, state.hour12);
    const bits = metaLine(wall, info);
    els.youMeta.innerHTML = escapeHtml(bits[0] + " · " + bits[1]) +
      (bits[2] ? ' · <span class="dst">' + escapeHtml(bits[2]) + "</span>" : "");

    const cards = els.clockGrid.querySelectorAll(".clock-card");
    for (let i = 0; i < cards.length; i++) {
      const tz = cards[i].getAttribute("data-tz");
      const w = Tz.getWallParts(tz, now);
      const d = Tz.getDSTInfo(tz, now);
      const timeEl = cards[i].querySelector(".card-time");
      const dateEl = cards[i].querySelector(".card-date");
      const offEl = cards[i].querySelector(".card-off");
      if (timeEl) timeEl.textContent = Tz.formatTime(w, state.hour12);
      if (dateEl) dateEl.textContent = Tz.formatDate(w);
      if (offEl) {
        const dst = dstPhrase(d);
        offEl.innerHTML = escapeHtml(w.offsetLabel) +
          (dst ? ' · <span class="dst">' + escapeHtml(dst) + "</span>" : "");
      }
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
    state.favs.forEach(function (tz) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = Tz.shortName(tz);
      btn.setAttribute("aria-label", "Add " + Tz.friendlyName(tz) + " to the grid");
      btn.addEventListener("click", function () { addZone(tz); });
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
    const warnings = Tz.dstWarnings(state.zones, Date.now(), 30, userZone);
    const warnByZone = {};
    warnings.forEach(function (w) { warnByZone[w.timeZone] = w; });

    state.zones.forEach(function (tz) {
      const card = document.createElement("article");
      card.className = "clock-card" + (Tz.sameZone(tz, userZone) ? " you-card" : "");
      card.setAttribute("data-tz", tz);

      const top = document.createElement("div");
      top.className = "card-top";

      const name = document.createElement("div");
      name.className = "card-name";
      name.textContent = Tz.shortName(tz);
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
      const faved = state.favs.indexOf(tz) !== -1;
      favBtn.setAttribute("aria-pressed", faved ? "true" : "false");
      favBtn.setAttribute("aria-label", (faved ? "Remove " : "Save ") + Tz.shortName(tz) + " as a favourite");
      favBtn.addEventListener("click", function () { toggleFav(tz); });

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "icon-btn";
      rm.innerHTML = closeSvg;
      rm.setAttribute("aria-label", "Remove " + Tz.shortName(tz));
      rm.addEventListener("click", function () { removeZone(tz); });

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

  function addZone(tz) {
    tz = Tz.resolveZone(tz);
    if (!isKnownZone(tz)) return;
    const exists = state.zones.some(function (z) { return Tz.sameZone(z, tz); });
    if (!exists) {
      state.zones.push(tz);
      writeStore();
      syncHash();
      renderGrid();
      renderMeeting();
    } else {
      const card = els.clockGrid.querySelector('[data-tz="' + cssEscape(tz) + '"]');
      if (card) card.focus ? card.scrollIntoView({ block: "nearest" }) : null;
    }
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function removeZone(tz) {
    state.zones = state.zones.filter(function (z) { return z !== tz; });
    writeStore();
    syncHash();
    renderGrid();
    renderMeeting();
  }

  function toggleFav(tz) {
    const i = state.favs.indexOf(tz);
    if (i === -1) state.favs.push(tz);
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
      items = rows.slice(0, 10);
      list.innerHTML = "";
      if (!items.length) {
        close();
        return;
      }
      items.forEach(function (row, i) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("role", "option");
        btn.id = list.id + "-opt-" + i;
        btn.setAttribute("aria-selected", "false");
        btn.innerHTML = escapeHtml(row.name) + "<small>" + escapeHtml(row.timeZone) + "</small>";
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
      if (opts.keepValue) input.value = row.name;
      else input.value = "";
      close();
    }

    function refresh() {
      open(Tz.searchTimeZones(input.value, allZones));
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
    state.to.forEach(function (tz) {
      const chip = document.createElement("span");
      chip.className = "target-chip";
      chip.appendChild(document.createTextNode(Tz.shortName(tz)));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Remove " + Tz.shortName(tz));
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        if (state.to.length === 1) return;
        state.to = state.to.filter(function (z) { return z !== tz; });
        syncHash();
        renderTargets();
        renderConverter();
      });
      chip.appendChild(btn);
      els.toTargets.appendChild(chip);
    });
  }

  function addTarget(tz) {
    tz = Tz.resolveZone(tz);
    if (!isKnownZone(tz)) return;
    if (!state.to.some(function (z) { return Tz.sameZone(z, tz); })) state.to.push(tz);
    syncHash();
    renderTargets();
    renderConverter();
  }

  function fillForm() {
    els.convDate.value = state.date;
    els.convTime.value = state.time;
    document.getElementById("conv-from").value = Tz.friendlyName(state.from);
    els.meetDate.value = state.meetingDate;
    els.workStart.value = state.workStart;
    els.workEnd.value = state.workEnd;
    renderTargets();
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

  function renderConverter() {
    const box = els.convResults;
    box.innerHTML = "";
    const parts = partsFromForm();
    if (!parts || !state.from || !state.to.length) return;
    let result;
    try {
      result = Tz.convertMany(state.from, state.to, parts);
    } catch (err) {
      const errBox = document.createElement("div");
      errBox.className = "form-errors";
      errBox.textContent = "That date and time could not be converted.";
      box.appendChild(errBox);
      return;
    }

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
          return Tz.shortName(t.timeZone) + " " + Tz.formatTimeShort(t.wall, state.hour12) +
            " (" + t.wall.offsetLabel + ")";
        });
        li.textContent = label + " (" + row.from.offsetLabel + "): " + bits.join("; ");
        ul.appendChild(li);
      });
      alt.appendChild(document.createTextNode("Both occurrences:"));
      alt.appendChild(ul);
      box.appendChild(alt);
    }

    result.results.forEach(function (row) {
      const card = document.createElement("div");
      card.className = "result-card";
      const where = document.createElement("div");
      where.className = "where";
      where.textContent = Tz.shortName(row.timeZone);
      const when = document.createElement("p");
      when.className = "when";
      when.textContent = Tz.formatTimeShort(row.wall, state.hour12);
      const date = document.createElement("p");
      date.innerHTML = escapeHtml(Tz.formatDate(row.wall)) +
        ' · <span class="shift">' + escapeHtml(row.dayShift) + "</span>";
      const gap = document.createElement("p");
      gap.textContent = row.gap.label + " at this date.";
      card.appendChild(where);
      card.appendChild(when);
      card.appendChild(date);
      card.appendChild(gap);
      if (row.gapDiffersFromToday) {
        const w = document.createElement("p");
        w.className = "shift";
        w.textContent = "Today the gap is different: " + row.gapToday.label + ".";
        card.appendChild(w);
      }
      box.appendChild(card);
    });
  }

  function addDays(year, month, day, delta) {
    const dt = new Date(Date.UTC(year, month - 1, day + delta));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
  }

  function renderMeeting() {
    const date = Tz.parseIsoDate(state.meetingDate);
    const zones = unique([userZone].concat(state.zones));
    els.meetBar.innerHTML = "";
    els.meetWindows.innerHTML = "";
    els.barLabel.innerHTML = "";
    els.barCaption.textContent = "";
    if (!date) return;

    const startLabel = dummyWall(0, 0);
    const midLabel = dummyWall(12, 0);
    const endLabel = dummyWall(0, 0);
    els.barLabel.innerHTML =
      "<span>" + escapeHtml(Tz.formatTimeShort({ hour: 0, minute: 0 }, state.hour12)) + "</span>" +
      "<span>" + escapeHtml(Tz.formatTimeShort({ hour: 12, minute: 0 }, state.hour12)) + "</span>" +
      "<span>" + escapeHtml(Tz.formatTimeShort({ hour: 0, minute: 0 }, state.hour12)) + "</span>";
    void startLabel; void midLabel; void endLabel;

    const dayStart = Tz.resolveLocal(userZone, {
      year: date.year, month: date.month, day: date.day, hour: 0, minute: 0, second: 0,
    }).instant;
    const next = addDays(date.year, date.month, date.day, 1);
    const dayEnd = Tz.resolveLocal(userZone, {
      year: next.year, month: next.month, day: next.day, hour: 0, minute: 0, second: 0,
    }).instant;
    const length = dayEnd - dayStart;

    let overlap;
    try {
      overlap = Tz.findMeetingOverlap({
        zones: zones,
        date: date,
        workStart: state.workStart,
        workEnd: state.workEnd,
      });
    } catch (err) {
      els.barCaption.textContent = "Those working hours could not be applied to this date.";
      return;
    }

    els.barCaption.textContent = "The bar is " + Tz.formatDate(Tz.getWallParts(userZone, dayStart)) +
      " in " + Tz.shortName(userZone) + ".";

    if (overlap.none) {
      const none = document.createElement("div");
      none.className = "notice";
      none.textContent = "There is no overlapping working hour on this date for the selected timezones.";
      els.meetWindows.appendChild(none);
      return;
    }

    overlap.formatted.forEach(function (win, index) {
      const left = ((win.start - dayStart) / length) * 100;
      const width = ((win.end - win.start) / length) * 100;
      const seg = document.createElement("div");
      seg.className = "bar-seg";
      seg.style.left = Math.max(0, left) + "%";
      seg.style.width = Math.max(0.4, width) + "%";
      els.meetBar.appendChild(seg);

      const card = document.createElement("div");
      card.className = "window-card";
      const h = document.createElement("h3");
      h.textContent = (overlap.formatted.length > 1 ? "Window " + (index + 1) + " · " : "Best overlap · ") +
        formatDuration(win.durationMin);
      const ul = document.createElement("ul");
      win.inZones.forEach(function (z) {
        const li = document.createElement("li");
        const city = document.createElement("span");
        city.className = "city";
        city.textContent = Tz.shortName(z.timeZone);
        const time = document.createElement("span");
        time.textContent = Tz.formatTimeShort(z.start, state.hour12) + " – " + Tz.formatTimeShort(z.end, state.hour12);
        li.appendChild(city);
        li.appendChild(time);
        ul.appendChild(li);
      });
      card.appendChild(h);
      card.appendChild(ul);
      els.meetWindows.appendChild(card);
    });
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

  function onFormChange() {
    state.date = els.convDate.value;
    state.time = els.convTime.value;
    state.meetingDate = els.meetDate.value;
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

    bindCombo(document.getElementById("zone-search"), document.getElementById("zone-list"), function (tz) {
      addZone(tz);
    });
    bindCombo(document.getElementById("conv-from"), document.getElementById("from-list"), function (tz) {
      state.from = tz;
      document.getElementById("conv-from").value = Tz.friendlyName(tz);
      syncHash();
      renderConverter();
    }, { keepValue: true });
    bindCombo(document.getElementById("conv-to"), document.getElementById("to-list"), function (tz) {
      addTarget(tz);
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
  setInterval(tick, 1000);
})();
