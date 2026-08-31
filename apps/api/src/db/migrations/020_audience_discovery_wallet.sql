ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'test_order_credit';

CREATE TABLE test_credit_orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount IN (100, 500, 1000, 5000)),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX test_credit_orders_user_created_idx
  ON test_credit_orders (user_id, created_at DESC, id DESC);
