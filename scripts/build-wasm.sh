#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_DIR="$REPO_ROOT/engine"
OUT_DIR="$REPO_ROOT/web/public"

echo "Building schemaseance.wasm..."
cd "$ENGINE_DIR"
GOOS=js GOARCH=wasm go build -o "$OUT_DIR/schemaseance.wasm" ./cmd/wasm/
echo "WASM built: $OUT_DIR/schemaseance.wasm ($(du -sh "$OUT_DIR/schemaseance.wasm" | cut -f1))"

echo "Copying wasm_exec.js..."
GOROOT=$(go env GOROOT)
WASM_EXEC="$GOROOT/misc/wasm/wasm_exec.js"
if [ ! -f "$WASM_EXEC" ]; then
  WASM_EXEC="$GOROOT/lib/wasm/wasm_exec.js"
fi
if [ -f "$WASM_EXEC" ]; then
  cp "$WASM_EXEC" "$OUT_DIR/wasm_exec.js"
  echo "Copied wasm_exec.js from $WASM_EXEC"
else
  echo "ERROR: wasm_exec.js not found in GOROOT=$GOROOT" >&2
  exit 1
fi
