# Project Decisions

## AI Context Pack

- Commit: b8f01a0e20af716e06aa196256579b44a0c958ab
- Script: scripts/ai_context_pack.sh
- Purpose: Emit a read-only, paste-friendly repo snapshot (git state, toolchain, repo map, key config heads, data-file checksums).
- Repo map excludes: .git, node_modules, dist (to keep output bounded).
- Usage: bash scripts/ai_context_pack.sh

- Executable bit tracked in git: b8f01a0e20af716e06aa196256579b44a0c958ab

## Plasmic Preview Page

- Commit: 8863ee8bfeb977f163d8b8661ad1c3b938f31d42
- Files: plasmic-preview.html, src/plasmic-preview.tsx
- Why: Provide a user-viewable preview page (no router) that renders a published Plasmic component for local dev and GitHub Pages builds.
- Component selection: hard-coded to "Homepage" (published Plasmic page/component).
- URL (dev): http://localhost:5173/plasmic-preview.html
