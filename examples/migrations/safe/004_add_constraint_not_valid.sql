-- Safe migration: add CHECK constraint with NOT VALID, then VALIDATE separately
SET lock_timeout = '2s';
ALTER TABLE orders ADD CONSTRAINT chk_status_not_null CHECK (status IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT chk_status_not_null;
