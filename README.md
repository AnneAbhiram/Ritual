# Ritual

A dark, colorful, offline-first habit tracker. Add habits, tick them off, and for the ones worth timing — an instrument, a language, a skill — log the hours toward a weekly or monthly goal.

Install it straight from your browser to your phone's home screen. No account, no server, no ads. Your data lives only on your device.

## Features

- **Simple habits** — did you do it today? Tick, or don't.
- **Timed habits** — tick "did it," then a slider logs how long. Set an optional weekly or monthly hour goal (e.g. 10 hrs/week of guitar) and watch a progress bar fill as you log time across the period — doesn't matter how the hours are split across days, only that they add up.
- **Goal celebrations** — cross your target before the period ends and you get a little chime plus a motivating line.
- **Streaks** — a running count of consecutive days for every habit.
- **Installable PWA** — add to your phone's home screen, works fully offline.
- **Dark, harmonious UI** — a curated accent palette so every habit's color tag feels part of the same family.

## Tech

No build step, no framework, no backend:

- Vanilla HTML/CSS/JS
- [sql.js](https://sql.js.org) (SQLite compiled to WebAssembly) for real relational storage, running entirely client-side
- The SQLite database is persisted as a binary blob in **IndexedDB**, so your data survives reloads and app restarts
- A service worker caches all assets for offline use

## Using it

**On your phone:** open the site (see below), then use your browser's "Add to Home Screen" option. It launches full-screen, like a native app.

**Locally, for development:** this repo ships a small dependency-free static server.

```bash
powershell -ExecutionPolicy Bypass -File scripts/dev-server.ps1
```

Then open `http://localhost:8080`.

## Project structure

```
index.html          entry point
css/styles.css       design tokens + all styling
js/db.js             SQLite schema, queries, IndexedDB persistence
js/app.js            UI rendering + interactions
js/dates.js          date/period math (week/month ranges, streaks)
js/quotes.js         motivational quote pool
js/audio.js          synthesized celebration chime (Web Audio, no audio files)
vendor/sql-wasm.*     vendored sql.js library
manifest.json, sw.js  PWA manifest + service worker
icons/                generated app icons
scripts/              icon generation + local dev server
```

## Data model

- `habits` — title, description, type (`simple`/`timed`), optional goal period + hours, accent color
- `entries` — one row per habit per day: done flag, and hours logged (timed habits only)
- `settings` — e.g. which day the week starts on, for weekly goal periods
- `celebrations` — tracks which goal periods have already been celebrated, so the chime only fires once per period
