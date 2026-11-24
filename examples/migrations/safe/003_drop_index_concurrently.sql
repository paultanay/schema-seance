-- Safe migration: DROP INDEX CONCURRENTLY outside any transaction block
DROP INDEX CONCURRENTLY IF EXISTS idx_old_index;
