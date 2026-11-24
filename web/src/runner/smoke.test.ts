import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { computeTableChecksum } from './checksum'

// Simulates the exact dualPostgres.runProof flow for Preset 1 (Checkout Lockout):
// CREATE INDEX without CONCURRENTLY. Data-preserving, so verdict must be SAFE.
describe('End-to-end browser flow simulation', () => {
  it('data-preserving migration produces checksum match (verdict SAFE reachable)', async () => {
    const schema = `
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        total_cents INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `

    const baselineDb = new PGlite()
    const candidateDb = new PGlite()
    try {
      await baselineDb.query(schema)
      await candidateDb.query(schema)

      // Seed identical rows into both, with NOW() timestamps differing by ms
      for (let i = 1; i <= 50; i++) {
        const sql = `INSERT INTO orders (user_id, status, total_cents) VALUES (${i}, 'pending', ${i * 100})`
        await baselineDb.query(sql)
        await candidateDb.query(sql)
      }

      // Pre-migration checksums
      const preBaseline = await computeTableChecksum(baselineDb, 'orders')
      const preCandidate = await computeTableChecksum(candidateDb, 'orders')

      // The fix: excluding volatile columns means both DBs hash identically
      expect(preBaseline).toBe(preCandidate)

      // Run the migration on candidate
      await candidateDb.query('CREATE INDEX idx_orders_user_id ON orders(user_id)')

      // Post-migration checksum
      const postCandidate = await computeTableChecksum(candidateDb, 'orders')

      // CREATE INDEX preserves data: post must still match baseline
      expect(postCandidate).toBe(preBaseline)

      // v1 app queries still work on candidate
      const r = await candidateDb.query('SELECT id, status FROM orders WHERE user_id = 1')
      expect(r.rows.length).toBe(1)
    } finally {
      await baselineDb.close()
      await candidateDb.close()
    }
  }, 60_000)

  it('truncating migration is caught as migration error (verdict UNSAFE detected)', async () => {
    const schema = `
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `

    const baselineDb = new PGlite()
    const candidateDb = new PGlite()
    try {
      await baselineDb.query(schema)
      await candidateDb.query(schema)

      const adversarial = ['😀 Emoji Name', 'অ বাংলা নাম', 'あいうえお日本語', 'A'.repeat(200), 'VeryLongDisplayNameThatExceedsSixteen']
      for (const name of adversarial) {
        const escaped = name.replace(/'/g, "''")
        const sql = `INSERT INTO customers (display_name) VALUES ('${escaped}')`
        await baselineDb.query(sql)
        await candidateDb.query(sql)
      }

      // PostgreSQL rejects the narrowing ALTER when existing rows do not fit.
      // The runner catches this as a migration error: verdict is UNSAFE with the
      // exact counterexample error shown to the user.
      let migrationError: string | null = null
      try {
        await candidateDb.query('ALTER TABLE customers ALTER COLUMN display_name TYPE VARCHAR(16)')
      } catch (e) {
        migrationError = e instanceof Error ? e.message : String(e)
      }

      expect(migrationError).not.toBeNull()
      expect(migrationError).toContain('value too long for type character varying(16)')
    } finally {
      await baselineDb.close()
      await candidateDb.close()
    }
  }, 60_000)
})
