# Dual PGlite Runner: Tasks

## Task 1: Checksum Module
- Implement `web/src/runner/checksum.ts`.
- Export `computeTableChecksum(db: PGlite, table: string): Promise<string>`.
- Covers REQ-PGL-004, REQ-PGL-007.

## Task 2: Chaos Generator
- Implement `web/src/runner/chaosGenerator.ts`.
- Export `generateRows(tableDef, count, seed): Row[]` covering all adversarial categories.
- Covers REQ-PGL-003.

## Task 3: Dual Postgres Orchestrator
- Implement `web/src/runner/dualPostgres.ts`.
- Export `runProof(preset, migrationSql): Promise<RunResult>`.
- Covers REQ-PGL-001, REQ-PGL-002, REQ-PGL-005, REQ-PGL-006, REQ-PGL-008, REQ-PGL-009.

## Task 4: Rewrite Proof Run
- Extend `dualPostgres.ts` with `runRewriteProof(preset, expandContractPhases): Promise<RewriteRunResult>`.
- Covers REQ-PGL-010.

## Task 5: Property-Based Tests
- Implement `web/src/runner/runner.pbt.test.ts` using fast-check + Vitest.
- Covers REQ-PGL-011.
- Three property tests: data preservation, checksum determinism, rollback equivalence.
