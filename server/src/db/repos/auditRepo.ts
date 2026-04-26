import type { PoolClient } from 'pg'

export type InsertAuditEventInput = {
  id: string
  orderId: string
  sequence: number
  eventType: string
  source: string
  emittedAt: Date
  summary: string
  reason: string | null
  patchJson: Record<string, unknown> | null
  orderSnapshotJson: Record<string, unknown> | null
}

/** Returns true if a new row was inserted (false if duplicate order_id + sequence). */
export async function tryInsertAuditEvent(client: PoolClient, input: InsertAuditEventInput): Promise<boolean> {
  const result = await client.query<{ id: string }>(
    `
    INSERT INTO order_audit_events (
      id, order_id, sequence, event_type, source, emitted_at, summary, reason, patch_json, order_snapshot_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::JSONB, $10::JSONB)
    ON CONFLICT (order_id, sequence) DO NOTHING
    RETURNING id
    `,
    [
      input.id,
      input.orderId,
      input.sequence,
      input.eventType,
      input.source,
      input.emittedAt,
      input.summary,
      input.reason,
      input.patchJson ? JSON.stringify(input.patchJson) : null,
      input.orderSnapshotJson ? JSON.stringify(input.orderSnapshotJson) : null,
    ],
  )
  return result.rowCount !== null && result.rowCount > 0 && result.rows.length > 0
}
