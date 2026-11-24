# SchemaSeance

Zero-backend browser application that proves whether a PostgreSQL migration is safe before it runs in production. Built for the Kiroween 2026 Hackathon (Category: Frankenstein).

## What It Does

A developer pastes a migration SQL, clicks Run Shadow Proof, and within seconds sees:

- The exact PostgreSQL 16 lock mode the migration acquires (ACCESS EXCLUSIVE, SHARE, etc.)
- Which concurrent reads and writes it blocks
- Whether any of 200 adversarial seed rows are truncated, rejected, or lost
- Whether v1 application queries still pass during rolling deployment
- A generated zero-downtime Expand-and-Contract rewrite that eliminates every critical hazard

## Architecture

SchemaSeance stitches three systems into one zero-backend browser application:

1. **Go SQL DDL Parser, Lock Analyzer, and Rewriter (WebAssembly):** A hand-written recursive-descent parser classifies PostgreSQL 16 lock levels and table-rewrite hazards across 10 rules (LOCK-001 through LOCK-010). The rewriter generates a deterministic 3-phase Expand-and-Contract migration plan for each hazard.

2. **Dual In-Browser PostgreSQL (PGlite WASM):** Two isolated PostgreSQL instances boot inside the browser with zero backend, zero login, zero API keys. The baseline runs the current schema. The candidate runs the proposed migration. Both receive the same 200 adversarial rows.

3. **Property-Based Chaos Prover:** Seeds both databases with adversarial data (NULLs, 4-byte UTF-8 emoji, boundary numbers, SQL metacharacters), runs concurrent v1 application queries, and compares SHA-256 table checksums to prove whether any row is lost, truncated, or rejected.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Engine | Go 1.23+ (pure, zero CGO, WASM target) |
| Property tests (Go) | pgregory.net/rapid |
| Frontend | Vite 6, React 19, TypeScript 5 |
| Styling | CSS variables (light/dark) |
| In-browser PostgreSQL | @electric-sql/pglite |
| Property tests (TS) | fast-check + Vitest |
| MCP server | TypeScript stdio |

## Repository Structure

```
schemaseance/
├── engine/          Go core: lexer, parser, 10 lock rules, rewriter, CLI, WASM
├── web/             Vite + React studio UI with dual PGlite runner
├── mcp/             MCP server wrapping the Go CLI
├── power/           Installable Kiro Power bundle
├── examples/        Safe and unsafe migration examples
├── scripts/         WASM build and submission verification
├── .kiro/           Steering, specs, hooks, agents, MCP config
└── docs/            Build log
```

## Local Development

```bash
# Build the Go engine and WASM binary
cd engine && go test ./... -v
cd .. && ./scripts/build-wasm.sh

# Install web dependencies and run dev server
cd web && npm install && npm run dev

# Run all tests and verification
./scripts/verify-submission.sh --gate
```

## Test Results

### Go Property-Based Tests (pgregory.net/rapid)

| Test | Property | Result |
|------|----------|--------|
| TestParserTotality | Arbitrary fuzzed strings never panic the parser | 100/100 pass |
| TestLexerTotality | Arbitrary byte slices never panic the lexer | 100/100 pass |
| TestDeterministicSerialization | Same input produces byte-identical JSON | 100/100 pass |
| TestRewriteSafetyInvariant | Analyze(Rewrite(sql)) produces zero CRITICAL findings | 100/100 pass |

### TypeScript Property-Based Tests (fast-check + Vitest)

| Test | Property | Result |
|------|----------|--------|
| Checksum Determinism | Same table produces identical checksum on repeated calls | 5/5 pass |
| Data Preservation | Expand-and-Contract ADD COLUMN preserves all rows | 5/5 pass |
| Rollback Equivalence | Up then down migration restores original checksum | 5/5 pass |

### Gate Check

| Category | Files | Result |
|----------|-------|--------|
| Safe migrations | 5 | All pass gate (exit 0) |
| Unsafe migrations | 5 | All fail gate (exit 2) with exact critical hazard details |

## Kiro Features

This repository demonstrates spec-driven development with Kiro:

- **Steering docs:** 5 files (product, tech, structure, postgres-locks, ui-craft) with `always` and `fileMatch` inclusion
- **EARS specs:** 4 spec directories (ast-analyzer, dual-pglite-runner, expand-contract-rewriter, studio-ui) each with requirements.md, design.md, tasks.md
- **Hooks:** PostFileSave hooks for Go and web, Stop hook for migration safety gate
- **Custom agent:** dba-adversary (read-only adversarial DBA with capability-based permissions)
- **MCP server:** stdio server exposing analyze_migration, run_shadow_proof, propose_expand_contract
- **Kiro Power:** installable bundle with MCP config and steering doc

## License

MIT
