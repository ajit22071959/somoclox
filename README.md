# somoclox

A small timezone helper: live clocks for your city and other business cities, a converter that respects daylight saving for the date you choose, and a meeting-time finder for the hours when everyone is at work.

Live site: https://ajit22071959.github.io/somoclox/

## What it does

- Shows your current time (from the timezone your browser reports) plus a default set of popular business cities, updating as the minute changes, with the UTC offset and whether daylight time is in effect.
- Lets you search timezones, cities, countries, abbreviations (such as IST or CST), and names like Central Standard Time, and add several cities to the compare grid. Favourites and the grid are remembered in this browser only.
- Converts a date and time from one timezone to one or more others, including the day shift ("next day", "previous day") and how far ahead or behind the other zone is on that date. Non-existent spring-forward times are shifted forward with a note; fall-back times that occur twice are listed, with the earlier occurrence used by default.
- Finds overlapping working hours for the converter's From timezone and each To timezone (default 09:00–18:00 for everyone, or different hours per city, including night shifts that cross midnight). A labelled bar shows each city's working window and the overlap in From-zone time. If there is no overlap, it says so and suggests the closest windows.
- Warns if a compared city's clocks change in the next 30 days, and if the gap between two zones on the converter date is not the same as today's gap.
- Lets you switch between 12-hour and 24-hour time, and copy a link that reproduces the current view.
- Tap or drag on the meeting bar (or use the arrow keys on it) to pick a time, snapped to 15 minutes. The time fills in the converter, and a marker shows it on the bar.
- Shows a live countdown next to the converted time ("Starts in 3h 20m", "Started 25m ago").
- Copies the converted time as one line of text, for example `Tue 10 Nov, 3:00 PM London / 4:00 PM Paris / 8:30 PM Hyderabad`, using your 12/24-hour choice and the city names you picked. The Compare cities grid has the same button.
- Adds the meeting to a calendar: a `.ics` file is made in the browser (times in UTC, so every calendar app places it correctly), with a length of 15 minutes to 2 hours, or a Google Calendar link. No account or server is involved.
- Shades every lane on the meeting bar by daytime, dawn or dusk, and night in that city, and tags converted times and city cards the same way.
- Flags when a time falls on a weekend in that city's country, including Friday–Saturday weekends (Saudi Arabia, Qatar, Kuwait, Egypt, Israel and others), Thursday–Friday (Afghanistan) and one-day weekends (Iran). The list is in `tz.js` (`WEEKEND_BY_COUNTRY`), checked against Unicode CLDR week data and Wikipedia in November 2026.
- A slider in Compare cities moves every clock up to 24 hours forwards or backwards together (drag, touch or arrow keys), with day and night shading for your own timezone and a Reset to now button.

Your own clock is labelled with the country and the timezone name from the browser, for example `India · India Standard Time` (the name follows daylight saving when a zone has it). City cards keep the city (or country) name you picked — so a search for Hyderabad is labelled Hyderabad, not Mumbai — and use the same country and timezone name on the line underneath. The shareable link remembers those labels.

Times use this browser's built-in timezone data. No data leaves the device.

## Running tests

Node.js 18+ (or 20, 22, 24) is enough. No other packages are required.

```bash
npm test
```

The tests cover New York vs London across the weeks when only one of them is on daylight time, India vs Nepal (15-minute offset), Sydney's southern-hemisphere daylight saving, zones with no daylight saving (Tokyo, Dubai), the spring-forward gap and fall-back ambiguity, day-shift labels, meeting overlap (including per-city hours, midnight-crossing shifts, no overlap, and half-hour offsets), URL state encode/decode, country-and-timezone place labels, timezone search (countries, cities, abbreviations, and long names, including every country in tzdata zone.tab), chosen display labels in the shareable URL, weekend rules by country, picking and snapping on the meeting bar (including DST days and 45-minute offsets), copy-as-text formatting, countdown text, day and night shading, and the `.ics` file and Google Calendar link.

To regenerate the timezone-to-country map from tzdata:

```bash
node scripts/build-zone-countries.js --download
```
