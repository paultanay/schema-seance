-- Safe migration: constant DEFAULT on PostgreSQL 11+ (metadata-only, no rewrite)
SET lock_timeout = '2s';
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
