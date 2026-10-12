# Focus – weekly goals

A phone-first web app for the weekly Focus System: Monday planning with 3 must-wins and smaller items, a daily
morning check-in and meetings log, a Friday close, and trends across weeks. It installs to the home screen and
works offline.

**Your data never leaves the phone.** Everything is stored in the browser on the device (IndexedDB). This
repository and the published site contain code only. Use Settings → Save backup file now and then.

## Install on Android

1. Open the app's address in Chrome.
2. Tap ⋮ → **Install app** (or **Add to Home screen**).
3. Open it from the new icon. To bring in the old spreadsheet: Settings → Import Excel planner.

## Develop

```sh
npm install
npm run dev     # local server
npm test        # unit tests; set PLANNER_XLSX=/path/to/weekly_planner_v3.xlsx to also test the importer
npm run build
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.
