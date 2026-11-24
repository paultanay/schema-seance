import type { PGlite } from '@electric-sql/pglite'

interface Row {
  [key: string]: unknown
}

const VOLATILE_COLUMNS = new Set(['created_at', 'updated_at'])

function canonicalizeRow(row: Row): string {
  const keys = Object.keys(row).filter(k => !VOLATILE_COLUMNS.has(k)).sort()
  return keys.map(k => `${k}=${JSON.stringify(row[k])}`).join('|')
}

export async function computeTableChecksum(db: PGlite, table: string): Promise<string> {
  const result = await db.query<Row>(`SELECT * FROM ${table} ORDER BY id`)
  const rows = result.rows

  const sorted = [...rows].sort((a, b) => canonicalizeRow(a).localeCompare(canonicalizeRow(b)))
  const serialized = sorted.map(canonicalizeRow).join('\n')

  const encoder = new TextEncoder()
  const data = encoder.encode(serialized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function computeChecksums(db: PGlite, tables: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const table of tables) {
    result[table] = await computeTableChecksum(db, table)
  }
  return result
}
