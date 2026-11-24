-- LOCK-004: CRITICAL - Volatile DEFAULT triggers full table rewrite
ALTER TABLE audit_events ADD COLUMN trace_id UUID DEFAULT gen_random_uuid();
