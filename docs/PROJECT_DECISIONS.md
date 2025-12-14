# Project Decisions

## AI Context Pack

- Commit: b8f01a0e20af716e06aa196256579b44a0c958ab
- Script: scripts/ai_context_pack.sh
- Purpose: Emit a read-only, paste-friendly repo snapshot (git state, toolchain, repo map, key config heads, data-file checksums).
- Repo map excludes: .git, node_modules, dist (to keep output bounded).
- Usage: bash scripts/ai_context_pack.sh

- Executable bit tracked in git: b8f01a0e20af716e06aa196256579b44a0c958ab
