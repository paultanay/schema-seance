export interface SeedRow {
  id: number
  [key: string]: unknown
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

function randomString(rand: () => number, length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(rand() * chars.length)]
  }
  return s
}

export function generateOrdersRows(count: number, seed: number): SeedRow[] {
  const rand = mulberry32(seed)
  const rows: SeedRow[] = []
  const statuses = ['pending', 'paid', 'cancelled', 'refunded']
  const normalCount = Math.floor(count * 0.8)

  for (let i = 1; i <= normalCount; i++) {
    rows.push({
      id: i,
      user_id: randomInt(rand, 1, 1000),
      status: statuses[Math.floor(rand() * statuses.length)],
      total_cents: randomInt(rand, 0, 999999),
    })
  }

  let id = normalCount + 1
  // Adversarial: boundary numbers
  rows.push({ id: id++, user_id: 0, status: 'pending', total_cents: 0 })
  rows.push({ id: id++, user_id: 2147483647, status: 'paid', total_cents: 2147483647 })
  rows.push({ id: id++, user_id: 1, status: 'pending', total_cents: -1 })
  // Max length status
  rows.push({ id: id++, user_id: 1, status: 'p'.repeat(50), total_cents: 100 })

  while (rows.length < count) {
    rows.push({
      id: id++,
      user_id: randomInt(rand, 1, 100),
      status: statuses[Math.floor(rand() * statuses.length)],
      total_cents: randomInt(rand, 100, 9999),
    })
  }

  return rows.slice(0, count)
}

export function generateCustomersRows(count: number, seed: number): SeedRow[] {
  const rand = mulberry32(seed)
  const rows: SeedRow[] = []
  const normalCount = Math.floor(count * 0.75)

  for (let i = 1; i <= normalCount; i++) {
    rows.push({
      id: i,
      display_name: randomString(rand, randomInt(rand, 3, 40)),
      email: `user${i}@example${i}.com`,
    })
  }

  let id = normalCount + 1
  // Adversarial: 4-byte UTF-8
  rows.push({ id: id++, display_name: '\uD83D\uDE00 Emoji Name', email: `emoji${id}@test.com` })
  rows.push({ id: id++, display_name: 'অ বাংলা নাম পরীক্ষা', email: `bengali${id}@test.com` })
  rows.push({ id: id++, display_name: 'あいうえお日本語テスト', email: `japanese${id}@test.com` })
  // Max length (will truncate with VARCHAR(16))
  rows.push({ id: id++, display_name: 'A'.repeat(255), email: `long${id}@test.com` })
  rows.push({ id: id++, display_name: 'VeryLongDisplayNameThatExceedsSixteen', email: `toolong${id}@test.com` })
  // SQL metacharacters
  rows.push({ id: id++, display_name: "O'Brien", email: `obrien${id}@test.com` })
  rows.push({ id: id++, display_name: 'Name; DROP TABLE--', email: `sqlinject${id}@test.com` })

  while (rows.length < count) {
    const i = id++
    rows.push({
      id: i,
      display_name: randomString(rand, randomInt(rand, 5, 20)),
      email: `gen${i}@example.com`,
    })
  }

  return rows.slice(0, count)
}

export function generatePaymentsRows(count: number, seed: number): SeedRow[] {
  const rand = mulberry32(seed)
  const rows: SeedRow[] = []
  const normalCount = Math.floor(count * 0.75)

  for (let i = 1; i <= normalCount; i++) {
    rows.push({
      id: i,
      amount_cents: randomInt(rand, 100, 100000),
      invoice_ref: rand() > 0.3 ? `INV-${i.toString().padStart(6, '0')}` : null,
      status: ['pending', 'paid', 'void'][Math.floor(rand() * 3)],
    })
  }

  let id = normalCount + 1
  // Adversarial: NULL invoice_ref (the key counterexample for SET NOT NULL)
  for (let i = 0; i < 10; i++) {
    rows.push({ id: id++, amount_cents: randomInt(rand, 100, 1000), invoice_ref: null, status: 'pending' })
  }
  // Empty string
  rows.push({ id: id++, amount_cents: 500, invoice_ref: '', status: 'pending' })
  // Boundary amounts
  rows.push({ id: id++, amount_cents: 0, invoice_ref: 'INV-ZERO', status: 'paid' })
  rows.push({ id: id++, amount_cents: 2147483647, invoice_ref: 'INV-MAX', status: 'paid' })

  while (rows.length < count) {
    rows.push({
      id: id++,
      amount_cents: randomInt(rand, 100, 10000),
      invoice_ref: `INV-${id}`,
      status: 'pending',
    })
  }

  return rows.slice(0, count)
}

export function generateAuditEventsRows(count: number, seed: number): SeedRow[] {
  const rand = mulberry32(seed)
  const rows: SeedRow[] = []
  const eventTypes = ['login', 'logout', 'purchase', 'refund', 'update']

  for (let i = 1; i <= count; i++) {
    rows.push({
      id: i,
      event_type: eventTypes[Math.floor(rand() * eventTypes.length)],
      user_id: rand() > 0.1 ? randomInt(rand, 1, 10000) : null,
      payload: rand() > 0.5 ? JSON.stringify({ key: randomString(rand, 5) }) : null,
    })
  }

  return rows.slice(0, count)
}

export function generateUsersRows(count: number, seed: number): SeedRow[] {
  const rand = mulberry32(seed)
  const rows: SeedRow[] = []
  const tiers = ['free', 'pro', 'enterprise']

  for (let i = 1; i <= count; i++) {
    rows.push({
      id: i,
      email: `user${i}@example${Math.floor(rand() * 100)}.com`,
      legacy_tier: tiers[Math.floor(rand() * tiers.length)],
    })
  }

  return rows.slice(0, count)
}
