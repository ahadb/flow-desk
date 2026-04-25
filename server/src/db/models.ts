export type DbOrderSide = 'buy' | 'sell'
export type DbOrderStatus = 'pending_new' | 'new' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected' | 'replaced'
export type DbTimeInForce = 'day' | 'gtc' | 'ioc' | 'fok' | 'at_open' | 'at_close'

export type OrderRow = {
  id: string
  client_order_id: string | null
  symbol: string
  side: DbOrderSide
  quantity: number
  limit_price: number | null
  filled_quantity: number
  average_fill_price: number | null
  pnl: number
  status: DbOrderStatus
  time_in_force: DbTimeInForce
  venue: string | null
  account: string | null
  counterparty: string | null
  rejection_reason: string | null
  created_at: Date
  updated_at: Date
}

export type AuditEventType = 'order_created' | 'order_updated' | 'order_cancelled' | 'order_rejected' | 'heartbeat'

export type OrderAuditEventRow = {
  id: string
  order_id: string
  sequence: number
  event_type: AuditEventType
  source: 'mock' | 'live'
  emitted_at: Date
  summary: string
  reason: string | null
  patch_json: Record<string, unknown> | null
  order_snapshot_json: Record<string, unknown> | null
  created_at: Date
}
