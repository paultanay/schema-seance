import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PGlite } from '@electric-sql/pglite'
import { computeTableChecksum } from './checksum'

const SIMPLE_SCHEMA = `
CREATE TABLE test_items (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0
);
`

async function withDb<T>(fn: (db: PGlite) => Promise<T>): Promise<T> {
  const db = new PGlite()
  try {
    return await fn(db)
  } finally {
    await db.close()
  }
}

function escapeText(s: string): string {
  return s.replace(/'/g, "''")
}

// The checksum is deterministic: calling it twice on the same unchanged table
// produces byte-identical output regardless of the data content.
describe('Checksum Determinism', () => {
  it('calling checksum twice on the same table produces identical output', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
            value: fc.integer({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          await withDb(async (db) => {
            await db.query(SIMPLE_SCHEMA)
            for (const item of items) {
              await db.query(
                `INSERT INTO test_items (label, value) VALUES ('${escapeText(item.label)}', ${item.value})`
              )
            }
            const checksum1 = await computeTableChecksum(db, 'test_items')
            const checksum2 = await computeTableChecksum(db, 'test_items')
            expect(checksum1).toBe(checksum2)
            expect(checksum1).toHaveLength(64)
          })
        }
      ),
      { numRuns: 5 }
    )
  }, 90_000)
})

// Data preservation: an Expand-and-Contract ADD COLUMN + backfill keeps all rows intact.
describe('Data Preservation', () => {
  it('expand-and-contract ADD COLUMN preserves all rows', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes("'")),
            value: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          await withDb(async (db) => {
            await db.query(SIMPLE_SCHEMA)
            for (const item of items) {
              await db.query(
                `INSERT INTO test_items (label, value) VALUES ('${escapeText(item.label)}', ${item.value})`
              )
            }

            // Safe expand: add nullable column (no rewrite, no ACCESS EXCLUSIVE table scan)
            await db.query(`ALTER TABLE test_items ADD COLUMN extra_col TEXT`)
            // Backfill
            await db.query(`UPDATE test_items SET extra_col = label`)

            const countResult = await db.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM test_items`)
            const count = parseInt(countResult.rows[0]?.count ?? '0', 10)
            expect(count).toBe(items.length)
          })
        }
      ),
      { numRuns: 5 }
    )
  }, 90_000)
})

// Rollback equivalence: applying an up-migration and then its down-migration
// restores the original table checksum.
describe('Rollback Equivalence', () => {
  it('up then down migration restores original checksum', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
            value: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (items) => {
          await withDb(async (db) => {
            await db.query(SIMPLE_SCHEMA)
            for (const item of items) {
              await db.query(
                `INSERT INTO test_items (label, value) VALUES ('${escapeText(item.label)}', ${item.value})`
              )
            }

            const before = await computeTableChecksum(db, 'test_items')

            // Up: add column and backfill
            await db.query(`ALTER TABLE test_items ADD COLUMN temp_col TEXT`)
            await db.query(`UPDATE test_items SET temp_col = label`)

            // Down: drop the added column (restore to original schema)
            await db.query(`ALTER TABLE test_items DROP COLUMN temp_col`)

            const after = await computeTableChecksum(db, 'test_items')
            expect(after).toBe(before)
          })
        }
      ),
      { numRuns: 5 }
    )
  }, 90_000)
})
