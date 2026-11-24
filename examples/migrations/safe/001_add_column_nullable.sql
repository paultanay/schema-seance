-- Safe migration: add nullable column (no default, no rewrite)
SET lock_timeout = '2s';
SET statement_timeout = '30s';
ALTER TABLE users ADD COLUMN display_name TEXT;
