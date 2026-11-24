-- Safe migration: CREATE INDEX CONCURRENTLY outside any transaction block
-- Does not block writes during index build
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
