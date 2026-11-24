#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE_MODE=false

if [ "${1:-}" = "--gate" ]; then
  GATE_MODE=true
fi

echo "=== SchemaSeance Submission Verification ==="
echo ""

# 1. Go tests
echo "1. Running Go tests..."
cd "$REPO_ROOT/engine"
if ! go test ./... -count=1 2>&1; then
  echo "FAIL: Go tests failed"
  exit 1
fi
echo "PASS: Go tests"
echo ""

# 2. WASM build
echo "2. Building WASM..."
cd "$REPO_ROOT"
if ! ./scripts/build-wasm.sh 2>&1; then
  echo "FAIL: WASM build failed"
  exit 1
fi
echo "PASS: WASM build"
echo ""

# 3. TypeScript typecheck
echo "3. Running TypeScript typecheck..."
if ! npm --prefix web run typecheck 2>&1; then
  echo "FAIL: TypeScript typecheck failed"
  exit 1
fi
echo "PASS: TypeScript typecheck"
echo ""

# 4. Vitest PBT
echo "4. Running Vitest PBT tests..."
if ! npm --prefix web test 2>&1; then
  echo "FAIL: Vitest PBT tests failed"
  exit 1
fi
echo "PASS: Vitest PBT tests"
echo ""

# 5. Production build
echo "5. Running production build..."
if ! npm --prefix web run build 2>&1; then
  echo "FAIL: Production build failed"
  exit 1
fi
echo "PASS: Production build"
echo ""

# 6. Gate: safe migrations pass, unsafe migrations fail
echo "6. Gate check on example migrations..."
CLI="$REPO_ROOT/engine/cmd/cli/schemaseance"

if [ ! -f "$CLI" ]; then
  cd "$REPO_ROOT/engine"
  go build -o ./cmd/cli/schemaseance ./cmd/cli/
  cd "$REPO_ROOT"
fi

SAFE_DIR="$REPO_ROOT/examples/migrations/safe"
UNSAFE_DIR="$REPO_ROOT/examples/migrations/unsafe"

# Safe migrations must pass
for f in "$SAFE_DIR"/*.sql; do
  if ! $CLI gate "$f" >/dev/null 2>&1; then
    echo "FAIL: Safe migration failed gate: $f"
    exit 1
  fi
done
echo "PASS: All safe migrations pass gate"

# Unsafe migrations must fail (at least one critical)
UNSAFE_FAIL_COUNT=0
for f in "$UNSAFE_DIR"/*.sql; do
  if $CLI gate "$f" >/dev/null 2>&1; then
    echo "FAIL: Unsafe migration passed gate (should have failed): $f"
    exit 1
  fi
  UNSAFE_FAIL_COUNT=$((UNSAFE_FAIL_COUNT + 1))
done
echo "PASS: All $UNSAFE_FAIL_COUNT unsafe migrations correctly fail gate"
echo ""

if [ "$GATE_MODE" = true ]; then
  echo "=== GATE MODE: All checks passed. Submission is safe. ==="
else
  echo "=== All verification checks passed. ==="
fi
