# Project Decisions

## AI Context Pack

- Commit: b8f01a0e20af716e06aa196256579b44a0c958ab
- Script: scripts/ai_context_pack.sh
- Purpose: Emit a read-only, paste-friendly repo snapshot (git state, toolchain, repo map, key config heads, data-file checksums).
- Repo map excludes: .git, node_modules, dist (to keep output bounded).
- Usage: bash scripts/ai_context_pack.sh

- Executable bit tracked in git: b8f01a0e20af716e06aa196256579b44a0c958ab

## Plasmic Preview Page

- Commit: db0f6d854f0afb885296afa3b933f9bcd955258e
- Files: plasmic-preview.html, src/plasmic-preview.tsx
- Why: Provide a user-viewable preview page (no router) that renders a published Plasmic component for local dev and GitHub Pages builds.
- Component selection: defaults to "Homepage" but can be overridden via Vite env var `VITE_PLASMIC_PREVIEW_COMPONENT`.
- URL (dev): http://localhost:5173/plasmic-preview.html
