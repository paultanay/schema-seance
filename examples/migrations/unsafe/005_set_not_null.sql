-- LOCK-005: CRITICAL - SET NOT NULL without prior validated CHECK constraint
ALTER TABLE payments ALTER COLUMN invoice_ref SET NOT NULL;
