# Kiro Build Log

This is an honest log of the development process, including real bugs caught by property-based testing, surprises encountered, and the IDE vs CLI usage pattern.

## Tool Usage

This project was built entirely in the Kiro CLI (command line). No IDE features were used. All file creation, editing, and verification happened through terminal commands and the Kiro agent.

## Real Bugs Caught by Property-Based Testing

### Bug 1: Rewrite Safety Invariant Failure (Go, rapid)

**Test:** `TestRewriteSafetyInvariant`
**Input:** `ALTER TABLE payments ALTER COLUMN ref SET NOT NULL;`
**Root Cause:** The Phase 3 rewrite for LOCK-005 contained `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` as a standalone statement. When analyzed in isolation, the classifier fired LOCK-005 again because it could not see that a VALIDATE CONSTRAINT for the matching constraint name had run in Phase 2.

**Fix:** Two changes:
1. The classifier now tracks `validatedConstraints` across statements in the same script. When a `VALIDATE CONSTRAINT` for `chk_<table>_<column>_not_null` appears before a `SET NOT NULL`, LOCK-005 is suppressed.
2. The rewriter's Phase 3 for LOCK-005 now includes a redundant `VALIDATE CONSTRAINT` statement before `SET NOT NULL`, making Phase 3 self-contained and safe even when analyzed independently.

**Lesson:** Property-based testing caught a real cross-statement context dependency that unit tests missed. The test correctly proved that analyzing rewrite phases individually (the initial approach) was wrong, and analyzing them as complete SQL blocks with the right cross-statement tracking was correct.

### Bug 2: Checksum Order Invariance Failure (TypeScript, fast-check)

**Test:** `Checksum Determinism > is invariant to insertion order`
**Counterexample:** `[{label:" ", value:0}, {label:" ", value:1}]`
**Root Cause:** The original test attempted to prove that the SHA-256 table checksum is invariant to row insertion order. However, the `id` column is a SERIAL primary key that increments with insertion order. Two rows inserted in different order get different IDs, so the checksum (which includes the `id` column) necessarily differs.

This was a test design error, not a checksum implementation bug. The checksum correctly detects any data change. The property "invariant to insertion order" does not hold when rows have auto-increment IDs that depend on insertion order.

**Fix:** Rewrote the property to test what actually matters: calling `computeTableChecksum` twice on the same unchanged table produces identical output. This is the real determinism guarantee. The checksum is deterministic and reproducible for the same data, which is what the migration prover needs.

**Lesson:** fast-check's shrinking found the minimal counterexample (two rows with identical labels but different values) in 14 shrink steps. This revealed the test was proving the wrong property.

## Surprises

1. **PGlite startup time:** Each PGlite instance takes 1-3 seconds to boot in Node tests. With 5 property runs and 2 databases per run, the checksum determinism test takes 3 seconds. The test timeout had to be increased to 90 seconds.

2. **Vite optimizeDeps:** The `@electric-sql/pglite` package must be excluded from Vite's dependency pre-bundling via `optimizeDeps: { exclude: [...] }`. Without this, Vite breaks PGlite's internal WASM asset loading in both dev and production builds.

3. **Go WASM binary size:** The compiled WASM binary is 4.5 MB. This is expected for a Go WASM binary that includes the Go runtime. The browser loads it once on first visit.

4. **rapid fail file replay:** When a rapid property test fails, it saves a fail file to reproduce the exact failure. After fixing the bug, the fail file must be deleted or rapid replays the old (now-fixed) failure instead of running new random inputs.
