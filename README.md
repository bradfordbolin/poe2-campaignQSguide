# Brodfard’s Campaign Quickstart Guide

A single-page Path of Exile 2 campaign quickstart guide (Vite + React + TypeScript) with per-section routes and progress tracking.

## Features
- Act/Interlude accordion layout with section routes, checklists, tips, and upgrade reminders.
- Speedrun vs Full modes (Speedrun = required/permanent power + required gates; Full adds optional content).
- Progress + UI preferences persist in `localStorage` (versioned by `meta.revision`).
- Sidebars: table of contents + search (left), live game info + helpful links (right).
- Theme/font controls and common UX settings (compact mode, sticky header, etc).

## Master data
- Canonical source files live at the repo root:
  - `poe2_master_db.json`
  - `poe2_master_info_sheet.md`
- Runtime uses bundled copies at `src/data/poe2_master_db.json` and `src/data/poe2_master_info_sheet.md`. Update these copies whenever the root master files change to keep the UI in sync.

## Game info feeds
- `public/poe2-game-info.json` drives the live sidebar stats (Steam player counts, league name + uptime, patch version/news).
- Refresh locally with `npm run update:poe2-game-info` (requires internet).

## Data handling
- Types: `src/types/masterDb.ts`
- Validation + normalization + checklist generation: `src/lib/validateData.ts`, `src/lib/normalize.ts`
- UI + persistence: `src/App.tsx`

Note: If you change boss keys or section IDs, you will break existing saved progress. Avoid bumping `meta.revision` unless you intentionally want to reset stored progress for everyone.

## Development
```
npm install
npm run dev
npm run build
npm run lint
npm run format
npm run update:poe2-game-info
```

## GitHub Pages
The Vite config sets `base: '/poe2-campaignQSguide/'` for GitHub Pages. Use the same base path when deploying so asset URLs resolve correctly.
