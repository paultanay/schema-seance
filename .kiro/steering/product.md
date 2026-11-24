---
inclusion: always
---

# SchemaSeance: Product Steering

SchemaSeance is a zero-backend browser application that proves whether a PostgreSQL migration is safe before it runs in production. It combines a Go WebAssembly DDL parser and lock-hazard analyzer, two in-browser PostgreSQL instances (via PGlite WASM), and a property-based chaos prover to catch data loss, lock escalation, and rolling-deploy breakage without a staging database.

## Core User Promise

A developer pastes a migration SQL, clicks Run Shadow Proof, and within seconds sees:
- The exact PostgreSQL 16 lock mode the migration acquires
- Which concurrent reads and writes it blocks
- Whether any of 200 adversarial seed rows are truncated, rejected, or lost
- Whether v1 application queries still pass during rolling deployment
- A generated zero-downtime Expand-and-Contract rewrite that eliminates every critical hazard

## Target User

Backend and infrastructure engineers who write PostgreSQL migrations and need to verify safety without spinning up a staging database or waiting for a CI pipeline.

## Non-Goals

- Not a general SQL editor or query runner
- Not a migration runner or deployment tool
- Not a schema management or versioning system
- Does not connect to any remote database

## Success Criteria

A judge visiting the live Vercel URL sees Preset 1 pre-loaded, clicks Run Shadow Proof once, and immediately sees a real failure report with exact lock mode, failing v1 query, and counterexample row. Clicking Prove Safe Rewrite flips every metric from Red to Green within 10 seconds.
