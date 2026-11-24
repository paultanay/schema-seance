# Dual PGlite Runner: Design

## Module Map

```
web/src/runner/
  dualPostgres.ts      - Orchestrates baseline + candidate PGlite lifecycle
  chaosGenerator.ts    - Generates 200 deterministic adversarial seed rows
  checksum.ts          - Canonical row serialization + SHA-256 via Web Crypto
  runner.pbt.test.ts   - fast-check + Vitest property tests (Node, real PGlite)
```

## RunResult Type

```ts
interface RunResult {
  lockMode: string;
  blocksReads: boolean;
  blocksWrites: boolean;
  v1Passing: number;
  v1Total: number;
  v1Failures: Array<{ sql: string; error: string }>;
  rowsPreserved: number;
  rowsTotal: number;
  truncationCounterexamples: Array<{ id: unknown; column: string; before: unknown; after: unknown }>;
  baselineChecksum: string;
  candidateChecksum: string;
  checksumMatch: boolean;
  executionTimeMs: number;
  migrationError: string | null;
}
```

## Checksum Algorithm

Canonical serialization per row: sort columns alphabetically, serialize each value as `column=JSON.stringify(value)`, join with `|`, sort rows lexicographically, hash concatenated string with SHA-256, encode as hex.

This makes the checksum deterministic regardless of insertion order and sensitive to any value change.

## Chaos Generator

`chaosGenerator.ts` exports `generateRows(tableDef: TableDef, count: number, seed: number): Row[]`.

Seed 42 always produces the same rows. The first 160 rows are "normal" records. Rows 161-200 are adversarial:
- Rows 161-165: NULL in every nullable column
- Rows 166-170: empty string in every text column
- Rows 171-175: 4-byte UTF-8 (emoji: `\uD83D\uDE00`, Bengali: `অ`, Japanese: `あ`)
- Rows 176-180: max-length strings (255 chars)
- Rows 181-185: boundary numbers (0, -1, MAX_INT, MIN_INT)
- Rows 186-190: boundary timestamps (`1970-01-01`, `9999-12-31`)
- Rows 191-195: strings with SQL metacharacters (`'`, `"`, `;`, `--`, `\`)
- Rows 196-200: Unicode combining characters and control characters

## dualPostgres.ts Flow

```
runProof(preset, migrationSql) ->
  baselineDb = new PGlite()
  candidateDb = new PGlite()
  try:
    apply baseSchemaSql to both
    rows = generateRows(preset.tableDef, 200, 42)
    insert rows into both
    preBaselineChecksum = computeChecksum(baselineDb, preset.tables)
    preCandidateChecksum = computeChecksum(candidateDb, preset.tables)
    start = performance.now()
    migrationResult = await candidateDb.exec(migrationSql) [catch error]
    executionTimeMs = performance.now() - start
    v1Results = run preset.appQueries against both
    postCandidateChecksum = computeChecksum(candidateDb, preset.tables)
    build and return RunResult
  finally:
    await baselineDb.close()
    await candidateDb.close()
```
