# POE2 Campaign Checklist

A single-page Vite + React + TypeScript checklist for tracking Path of Exile 2 campaign progress by chapter and section.

## Master data
- Canonical source files live at the repo root:
  - `poe2_master_db.json`
  - `poe2_master_info_sheet.md`
- Runtime uses bundled copies at `src/data/poe2_master_db.json` and `src/data/poe2_master_info_sheet.md`. Update these copies whenever the root master files change to keep the UI in sync.

## Data handling
- Data types are defined in `src/types/masterDb.ts`.
- Normalization and checklist generation live in `src/lib/normalize.ts`:
  - Builds chapters in canonical order (Acts 1–4, then Interludes).
  - Filters inactive/deprecated sections and omits `sec_07`.
  - Resolves zone display names via `zones_db` and lists implied subzones for routing context.
  - Generates checklist items per section (base objective + boss and reward notes) with stable IDs.
- UI components consume the normalized data in `src/App.tsx` and persist completion state in `localStorage` (versioned using the master DB revision when present).

## Development
```
npm install
npm run dev
npm run build
npm run lint
npm run format
```

## GitHub Pages
The Vite config sets `base: '/poe2-campaignQSguide/'` for GitHub Pages. Use the same base path when deploying so asset URLs resolve correctly.
