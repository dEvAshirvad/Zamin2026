#!/usr/bin/env bash
# Removes Create Next App nested git so the monorepo root is the only git root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$ROOT/app/.git" ]]; then
  rm -rf "$ROOT/app/.git"
  echo "Removed app/.git"
else
  echo "No app/.git present"
fi
