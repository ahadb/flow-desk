-- FlowDesk baseline schema for orders + audit events.
-- Apply manually for now; migration tooling comes next.

create table if not exists orders (
  id text primary key,
  client_order_id text unique,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity integer not null check (quantity > 0),
  limit_price numeric(14, 4),
  filled_quantity integer not null default 0 check (filled_quantity >= 0),
  average_fill_price numeric(14, 4),
  pnl numeric(14, 4) not null default 0,
  status text not null check (status in ('pending_new', 'new', 'partially_filled', 'filled', 'cancelled', 'rejected', 'replaced')),
  time_in_force text not null check (time_in_force in ('day', 'gtc', 'ioc', 'fok', 'at_open', 'at_close')),
  venue text,
  account text,
  counterparty text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_symbol on orders (symbol);
create index if not exists idx_orders_updated_at on orders (updated_at desc);

create table if not exists order_audit_events (
  id text primary key,
  order_id text not null REFERENCES orders (id) on delete cascade,
  sequence bigint not null,
  event_type text not null check (event_type in ('order_created', 'order_updated', 'order_cancelled', 'order_rejected', 'heartbeat')),
  source text not null check (source in ('mock', 'live')),
  emitted_at timestamptz not null,
  summary text not null,
  reason text,
  patch_json jsonb,
  order_snapshot_json jsonb,
  created_at timestamptz not null default now(),
  unique (order_id, sequence)
);

create index if not exists idx_order_audit_events_order_id_emitted_at
  on order_audit_events (order_id, emitted_at desc);

create index if not exists idx_order_audit_events_sequence
  on order_audit_events (sequence);
