# somoclox

A small timezone helper: live clocks for your city and other business cities, a converter that respects daylight saving for the date you choose, and a meeting-time finder for the hours when everyone is at work.

Live site: https://ajit22071959.github.io/somoclox/

## What it does

- Shows your current time (from the timezone your browser reports) plus a default set of popular business cities, updating every second, with the UTC offset and whether daylight time is in effect.
- Lets you search timezones, cities, countries, abbreviations (such as IST or CST), and names like Central Standard Time, and add several cities to the compare grid. Favourites and the grid are remembered in this browser only.
- Converts a date and time from one timezone to one or more others, including the day shift ("next day", "previous day") and how far ahead or behind the other zone is on that date. Non-existent spring-forward times are shifted forward with a note; fall-back times that occur twice are listed, with the earlier occurrence used by default.
- Finds overlapping working hours (default 9:00–18:00, adjustable once for everyone) for the compared cities on a chosen date, or says when there is no overlap.
- Warns if a compared city's clocks change in the next 30 days, and if the gap between two zones on the converter date is not the same as today's gap.
- Lets you switch between 12-hour and 24-hour time, and copy a link that reproduces the current view.

Your own clock is labelled with the country and the timezone name from the browser, for example `India · India Standard Time` (the name follows daylight saving when a zone has it). City cards keep their city title and use the same country and timezone name on the line underneath.

Times use this browser's built-in timezone data. No data leaves the device.

## Running tests

Node.js 18+ (or 20, 22, 24) is enough. No other packages are required.

```bash
npm test
```

The tests cover New York vs London across the weeks when only one of them is on daylight time, India vs Nepal (15-minute offset), Sydney's southern-hemisphere daylight saving, zones with no daylight saving (Tokyo, Dubai), the spring-forward gap and fall-back ambiguity, day-shift labels, meeting overlap (including no overlap and half-hour offsets), URL state encode/decode, country-and-timezone place labels, and timezone search (countries, cities, abbreviations, and long names).

To regenerate the timezone-to-country map from tzdata:

```bash
node scripts/build-zone-countries.js --download
```
