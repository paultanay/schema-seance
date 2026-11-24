-- LOCK-002: CRITICAL - CREATE INDEX without CONCURRENTLY blocks all writes
CREATE INDEX idx_orders_user_id ON orders(user_id);
