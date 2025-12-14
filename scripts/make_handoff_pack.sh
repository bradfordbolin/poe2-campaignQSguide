#!/usr/bin/env bash
set -euo pipefail

# Create a copy/paste-friendly handoff zip under /tmp that bundles:
# - AI context pack output
# - Canonical data files and key docs
#
# This script intentionally does NOT include .env.local or any secrets.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

timestamp() {
  date -u +"%Y%m%d_%H%M%S" 2>/dev/null || date +"%Y%m%d_%H%M%S"
}

log() {
  printf "%s\n" "$*"
}

warn() {
  printf "WARN: %s\n" "$*" >&2
}

copy_if_present() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp -f "$src" "$dest"
  else
    warn "Missing file: $src"
  fi
}

zip_dir() {
  local dir="$1"
  local out="$2"

  if command -v zip >/dev/null 2>&1; then
    (cd "$dir" && zip -r "$out" .) >/dev/null
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$dir" "$out" <<'PY'
import os
import sys
import zipfile

root = sys.argv[1]
out = sys.argv[2]

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for base, _, files in os.walk(root):
        for name in files:
            path = os.path.join(base, name)
            arc = os.path.relpath(path, root)
            zf.write(path, arcname=arc)
PY
    return 0
  fi

  warn "Neither zip nor python3 found; cannot create zip."
  return 1
}

ts="$(timestamp)"
staging="$(mktemp -d "/tmp/poe2_handoff_staging_${ts}.XXXX")"
out="/tmp/poe2_handoff_${ts}.zip"

trap 'rm -rf "$staging" >/dev/null 2>&1 || true' EXIT

log "Repo root: $ROOT"
log "Staging dir: $staging"

log "Generating AI context pack..."
if [[ -x "$ROOT/scripts/ai_context_pack.sh" ]]; then
  "$ROOT/scripts/ai_context_pack.sh" >"$staging/ai_context_pack_output.txt" 2>&1 || true
else
  warn "scripts/ai_context_pack.sh not found or not executable."
  printf "ai_context_pack.sh missing or not executable\n" >"$staging/ai_context_pack_output.txt"
fi

log "Copying handoff files..."
copy_if_present "poe2_master_db.json" "$staging/poe2_master_db.json"
copy_if_present "poe2_master_info_sheet.md" "$staging/poe2_master_info_sheet.md"
copy_if_present "public/poe2-game-info.json" "$staging/public/poe2-game-info.json"
copy_if_present "docs/codex_vscode_prompt_template.txt" "$staging/docs/codex_vscode_prompt_template.txt"
copy_if_present "docs/PROJECT_DECISIONS.md" "$staging/docs/PROJECT_DECISIONS.md"
copy_if_present "docs/AI_CHANGELOG.md" "$staging/docs/AI_CHANGELOG.md"

log "Writing manifest..."
{
  echo "poe2-campaignQSguide handoff pack"
  echo "timestamp_utc=$ts"
  echo "repo_root=$ROOT"
  echo
  echo "included_files:"
  find "$staging" -type f | sed "s|^$staging/||" | sort
} >"$staging/manifest.txt"

log "Creating zip..."
rm -f "$out" >/dev/null 2>&1 || true
zip_dir "$staging" "$out"

log "Done."
log "$out"

