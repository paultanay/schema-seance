import { PGlite } from '@electric-sql/pglite'
import { computeChecksums } from './checksum'
import {
  generateOrdersRows,
  generateCustomersRows,
  generatePaymentsRows,
  generateAuditEventsRows,
  generateUsersRows,
  type SeedRow,
} from './chaosGenerator'
import type { Preset } from '../presets/outages'
import type { RewritePlan } from '../wasm/bridge'

export interface V1QueryResult {
  sql: string
  passedBaseline: boolean
  passedCandidate: boolean
  error: string | null
}

export interface RunResult {
  lockMode: string
  blocksReads: boolean
  blocksWrites: boolean
  v1Results: V1QueryResult[]
  v1Passing: number
  v1Total: number
  rowsPreserved: number
  rowsTotal: number
  truncationCounterexamples: Array<{ id: unknown; column: string; before: unknown; after: unknown }>
  baselineChecksums: Record<string, string>
  candidateChecksums: Record<string, string>
  checksumMatch: boolean
  executionTimeMs: number
  migrationError: string | null
}

export interface RewriteRunResult extends RunResult {
  rewritePhases: string[][]
}

const SEED_COUNT = 200

function getRowGenerator(tableName: string): (count: number, seed: number) => SeedRow[] {
  switch (tableName) {
    case 'orders': return generateOrdersRows
    case 'customers': return generateCustomersRows
    case 'payments': return generatePaymentsRows
    case 'audit_events': return generateAuditEventsRows
    case 'users': return generateUsersRows
    default: return generateOrdersRows
  }
}

function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  const s = String(val)
  return `'${s.replace(/'/g, "''")}'`
}

async function insertRows(db: PGlite, table: string, rows: SeedRow[]): Promise<void> {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0])
  for (const row of rows) {
    const vals = cols.map(c => escapeValue(row[c])).join(', ')
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals})`
    try {
      await db.query(sql)
    } catch {
      // Skip rows that fail (e.g., duplicate unique key)
    }
  }
}

async function runAppQueries(db: PGlite, queries: string[]): Promise<Array<{ sql: string; error: string | null }>> {
  const results = []
  for (const sql of queries) {
    try {
      await db.query(sql)
      results.push({ sql, error: null })
    } catch (e) {
      results.push({ sql, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return results
}

export async function runProof(preset: Preset, migrationSql: string): Promise<RunResult> {
  const baselineDb = new PGlite()
  const candidateDb = new PGlite()

  try {
    await baselineDb.query(preset.baseSchemaSql)
    await candidateDb.query(preset.baseSchemaSql)

    const gen = getRowGenerator(preset.tables[0])
    const rows = gen(SEED_COUNT, 42)
    await insertRows(baselineDb, preset.tables[0], rows)
    await insertRows(candidateDb, preset.tables[0], rows)

    const baselineChecksums = await computeChecksums(baselineDb, preset.tables)

    let migrationError: string | null = null
    const start = performance.now()
    try {
      await candidateDb.query(migrationSql)
    } catch (e) {
      migrationError = e instanceof Error ? e.message : String(e)
    }
    const executionTimeMs = Math.round(performance.now() - start)

    const baselineQueryResults = await runAppQueries(baselineDb, preset.appQueries)
    const candidateQueryResults = await runAppQueries(candidateDb, preset.appQueries)

    const v1Results: V1QueryResult[] = preset.appQueries.map((sql, i) => ({
      sql,
      passedBaseline: baselineQueryResults[i].error === null,
      passedCandidate: candidateQueryResults[i].error === null,
      error: candidateQueryResults[i].error,
    }))

    const v1Passing = v1Results.filter(r => r.passedCandidate).length

    const candidateChecksums = await computeChecksums(candidateDb, preset.tables)

    const checksumMatch = preset.tables.every(t => baselineChecksums[t] === candidateChecksums[t])

    const truncationCounterexamples = await detectTruncations(baselineDb, candidateDb, preset.tables[0], migrationError)

    const rowsResult = await baselineDb.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${preset.tables[0]}`)
    const rowsTotal = parseInt(rowsResult.rows[0]?.count ?? '0', 10)

    let rowsPreserved = rowsTotal
    if (!migrationError) {
      try {
        const candCount = await candidateDb.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM ${preset.tables[0]}`)
        rowsPreserved = parseInt(candCount.rows[0]?.count ?? '0', 10)
      } catch {
        rowsPreserved = 0
      }
    }

    return {
      lockMode: 'ACCESS EXCLUSIVE',
      blocksReads: true,
      blocksWrites: true,
      v1Results,
      v1Passing,
      v1Total: preset.appQueries.length,
      rowsPreserved,
      rowsTotal,
      truncationCounterexamples,
      baselineChecksums,
      candidateChecksums,
      checksumMatch,
      executionTimeMs,
      migrationError,
    }
  } finally {
    await baselineDb.close()
    await candidateDb.close()
  }
}

async function detectTruncations(
  baselineDb: PGlite,
  candidateDb: PGlite,
  table: string,
  migrationError: string | null
): Promise<Array<{ id: unknown; column: string; before: unknown; after: unknown }>> {
  if (migrationError) return []

  const examples: Array<{ id: unknown; column: string; before: unknown; after: unknown }> = []

  try {
    const before = await baselineDb.query<Record<string, unknown>>(`SELECT * FROM ${table} LIMIT 500`)
    const after = await candidateDb.query<Record<string, unknown>>(`SELECT * FROM ${table} LIMIT 500`)

    const afterById = new Map<unknown, Record<string, unknown>>()
    for (const row of after.rows) {
      afterById.set(row['id'], row)
    }

    for (const beforeRow of before.rows) {
      const afterRow = afterById.get(beforeRow['id'])
      if (!afterRow) {
        examples.push({ id: beforeRow['id'], column: '*', before: beforeRow, after: null })
        continue
      }
      for (const col of Object.keys(beforeRow)) {
        const bVal = beforeRow[col]
        const aVal = afterRow[col]
        if (bVal !== null && aVal !== null && String(bVal) !== String(aVal)) {
          if (typeof bVal === 'string' && typeof aVal === 'string' && aVal.length < bVal.length) {
            examples.push({ id: beforeRow['id'], column: col, before: bVal, after: aVal })
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return examples.slice(0, 10)
}

export async function runRewriteProof(preset: Preset, plan: RewritePlan): Promise<RewriteRunResult> {
  const rewriteSql = [...plan.phase1, ...plan.phase2, ...plan.phase3]
    .filter(s => !s.trim().startsWith('--'))
    .join('\n')

  const result = await runProof(preset, rewriteSql)
  return {
    ...result,
    rewritePhases: [plan.phase1, plan.phase2, plan.phase3],
  }
}
