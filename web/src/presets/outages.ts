export interface Preset {
  id: number
  name: string
  description: string
  baseSchemaSql: string
  migrationSql: string
  appQueries: string[]
  tables: string[]
}

export const PRESETS: Preset[] = [
  {
    id: 0,
    name: 'Checkout Lockout',
    description: 'CREATE INDEX without CONCURRENTLY blocks all writes on orders during peak traffic.',
    tables: ['orders'],
    baseSchemaSql: `
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
    `.trim(),
    migrationSql: `CREATE INDEX idx_orders_user_id ON orders(user_id);`,
    appQueries: [
      `INSERT INTO orders (user_id, status, total_cents) VALUES (1, 'pending', 4999)`,
      `SELECT id, status FROM orders WHERE user_id = 1`,
      `UPDATE orders SET status = 'paid' WHERE id = 1`,
    ],
  },
  {
    id: 1,
    name: 'Silent UTF-8 Truncation',
    description: 'ALTER COLUMN TYPE VARCHAR(16) silently truncates multilingual display names.',
    tables: ['customers'],
    baseSchemaSql: `
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
    `.trim(),
    migrationSql: `ALTER TABLE customers ALTER COLUMN display_name TYPE VARCHAR(16);`,
    appQueries: [
      `SELECT id, display_name FROM customers WHERE id = 1`,
      `INSERT INTO customers (display_name, email) VALUES ('Test User', 'test@example.com')`,
      `UPDATE customers SET display_name = 'Updated Name' WHERE id = 1`,
    ],
  },
  {
    id: 2,
    name: 'Midnight SET NOT NULL',
    description: 'ALTER COLUMN SET NOT NULL on payments.invoice_ref with existing NULL rows causes an ACCESS EXCLUSIVE scan and fails on NULL counterexamples.',
    tables: ['payments'],
    baseSchemaSql: `
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  amount_cents INTEGER NOT NULL,
  invoice_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
    `.trim(),
    migrationSql: `ALTER TABLE payments ALTER COLUMN invoice_ref SET NOT NULL;`,
    appQueries: [
      `INSERT INTO payments (amount_cents, invoice_ref, status) VALUES (10000, 'INV-001', 'paid')`,
      `SELECT id, invoice_ref FROM payments WHERE status = 'pending'`,
      `UPDATE payments SET status = 'void' WHERE invoice_ref IS NULL`,
    ],
  },
  {
    id: 3,
    name: 'Volatile Default Rewrite',
    description: 'ADD COLUMN DEFAULT gen_random_uuid() triggers a full table rewrite on audit_events.',
    tables: ['audit_events'],
    baseSchemaSql: `
CREATE TABLE audit_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id INTEGER,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
    `.trim(),
    migrationSql: `ALTER TABLE audit_events ADD COLUMN trace_id UUID DEFAULT gen_random_uuid();`,
    appQueries: [
      `INSERT INTO audit_events (event_type, user_id) VALUES ('login', 42)`,
      `SELECT id, event_type, trace_id FROM audit_events WHERE user_id = 42`,
      `UPDATE audit_events SET payload = '{}' WHERE trace_id IS NULL`,
    ],
  },
  {
    id: 4,
    name: 'Rolling-Deploy DROP COLUMN',
    description: 'DROP COLUMN users.legacy_tier breaks v1 app queries during rolling deployment.',
    tables: ['users'],
    baseSchemaSql: `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  legacy_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
    `.trim(),
    migrationSql: `ALTER TABLE users DROP COLUMN legacy_tier;`,
    appQueries: [
      `SELECT id, email, legacy_tier FROM users WHERE id = 1`,
      `INSERT INTO users (email, legacy_tier) VALUES ('new@example.com', 'pro')`,
      `UPDATE users SET legacy_tier = 'enterprise' WHERE id = 1`,
    ],
  },
]
