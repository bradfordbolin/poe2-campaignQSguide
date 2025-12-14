#!/usr/bin/env bash
set -uo pipefail

# AI Context Pack (read-only). Designed for copy/paste into ChatGPT.
# Do not write/modify repo state.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

hr() { printf "\n============================================================\n"; }
h1() { hr; printf "%s\n" "$1"; hr; }
maybe() { "$@" 2>&1 || true; }

sha256_any() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$@"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$@"
  else
    echo "sha256 tool not found (sha256sum/shasum missing)"
    return 0
  fi
}

print_file_head() {
  local path="$1"
  local max_lines="${2:-200}"
  if [[ -f "$path" ]]; then
    echo "--- FILE: $path (head -n $max_lines) ---"
    sed -n "1,${max_lines}p" "$path"
    echo "--- END FILE: $path ---"
  fi
}

h1 "AI CONTEXT PACK v1"
echo "Timestamp: $(date -Is 2>/dev/null || date)"
echo "Repo root: $ROOT"
maybe uname -a

h1 "GIT"
maybe git rev-parse --show-toplevel
maybe git rev-parse HEAD
maybe git status -sb
maybe git remote -v
echo
maybe git log -5 --oneline --decorate

h1 "TOOLCHAIN"
maybe node -v
maybe npm -v
maybe git --version
maybe python3 --version

h1 "REPO MAP"
echo "Top-level:"
maybe ls -la

echo
echo "Files (maxdepth 3, excludes: .git node_modules dist):"
maybe find . -maxdepth 3 \
  \( -path './.git' -o -path './node_modules' -o -path './dist' \) -prune -o \
  -type f -print \
  | sed 's|^\./||' \
  | sort

h1 "KEY FILE SUMMARIES (bounded)"
print_file_head "package.json" 160

# Vite config(s)
print_file_head "vite.config.ts" 160
print_file_head "vite.config.js" 160
print_file_head "vite.config.mjs" 160

# TS configs
for f in tsconfig*.json; do
  print_file_head "$f" 160
done

print_file_head "index.html" 160

# Common Vite/React entry points
print_file_head "src/main.tsx" 160
print_file_head "src/main.ts" 160
print_file_head "src/App.tsx" 160
print_file_head "src/App.ts" 160

h1 "DATA FILES (canonical + mirrors)"
echo "Repo-root candidates (poe2_master_*):"
maybe bash -lc "ls -la poe2_master_* 2>/dev/null || true"

echo
echo "src/data/:"
maybe bash -lc "ls -la src/data 2>/dev/null || true"
maybe bash -lc "find src/data -maxdepth 2 -type f 2>/dev/null | sed 's|^\./||' | sort || true"

echo
echo "Mirror presence check (repo-root poe2_master_* -> src/data/*):"
missing_any=0
if ls poe2_master_* >/dev/null 2>&1; then
  for f in poe2_master_*; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    mirror="src/data/$base"
    if [[ -f "$mirror" ]]; then
      echo "OK: $f -> $mirror"
    else
      echo "MISSING MIRROR: $f -> $mirror"
      missing_any=1
    fi
  done
else
  echo "(none found)"
fi

if [[ $missing_any -eq 0 ]]; then
  echo "All repo-root poe2_master_* files have mirrors under src/data/."
fi

echo
echo "Checksums (sha256) for repo-root poe2_master_* (canonical):"
if ls poe2_master_* >/dev/null 2>&1; then
  sha256_any poe2_master_* 2>/dev/null || true
else
  echo "(none found)"
fi

echo
echo "Checksums (sha256) for src/data/* (mirrors + app-bundled data):"
if [[ -d "src/data" ]]; then
  # shellcheck disable=SC2046
  FILES=$(find src/data -type f 2>/dev/null | sort || true)
  if [[ -n "${FILES}" ]]; then
    # shellcheck disable=SC2086
    sha256_any ${FILES} 2>/dev/null || true
  else
    echo "(no files under src/data)"
  fi
else
  echo "(src/data not found)"
fi

h1 "NEXT ACTIONS"
echo "- Paste this entire output into ChatGPT."
echo "- If data files changed via Codex, re-sync repo-root masters into src/data/."
echo "- Ready to proceed to Plasmic integration once routing + host strategy is selected."
