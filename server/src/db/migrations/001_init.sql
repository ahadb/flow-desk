-- FlowDesk baseline schema for orders + audit events.

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_order_id TEXT UNIQUE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  limit_price NUMERIC(14, 4),
  filled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  average_fill_price NUMERIC(14, 4),
  pnl NUMERIC(14, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending_new', 'new', 'partially_filled', 'filled', 'cancelled', 'rejected', 'replaced')),
  time_in_force TEXT NOT NULL CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok', 'at_open', 'at_close')),
  venue TEXT,
  account TEXT,
  counterparty TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders (symbol);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders (updated_at DESC);

CREATE TABLE IF NOT EXISTS order_audit_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('order_created', 'order_updated', 'order_cancelled', 'order_rejected', 'heartbeat')),
  source TEXT NOT NULL CHECK (source IN ('mock', 'live')),
  emitted_at TIMESTAMPTZ NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT,
  patch_json JSONB,
  order_snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_order_audit_events_order_id_emitted_at
  ON order_audit_events (order_id, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_audit_events_sequence
  ON order_audit_events (sequence);
