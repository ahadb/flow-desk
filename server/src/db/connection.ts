import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pool, type PoolConfig } from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Repo root (…/flow-desk), so `DATABASE_SSL_CA` can be relative to the project. */
const REPO_ROOT = path.resolve(__dirname, '../../..')

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function resolveSslCaPath(raw: string): string {
  const trimmed = raw.trim()
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(REPO_ROOT, trimmed)
}

function sslCaFromEnv(): string | undefined {
  const raw = process.env.DATABASE_SSL_CA?.trim() || process.env.PGSSLROOTCERT?.trim()
  if (!raw) return undefined
  return fs.readFileSync(resolveSslCaPath(raw), 'utf8')
}

/**
 * When `sslmode` is present, current `pg` / `pg-connection-string` maps `require` to strict verify
 * behavior; supplying `ssl.ca` via PoolConfig can fail to merge as expected. Strip SSL query params
 * and rely on `config.ssl` below when a Cloud SQL (or custom) CA PEM is provided.
 */
function connectionStringWithoutSslQueryParams(connectionString: string): string {
  try {
    const normalized = connectionString.startsWith('postgres://')
      ? `postgresql://${connectionString.slice('postgres://'.length)}`
      : connectionString
    const u = new URL(normalized)
    for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      u.searchParams.delete(key)
    }
    let out = u.toString()
    if (out.startsWith('postgresql://')) {
      out = `postgres://${out.slice('postgresql://'.length)}`
    }
    return out
  } catch {
    return connectionString
  }
}

function hostnameFromConnectionString(connectionString: string): string {
  const normalized = connectionString.startsWith('postgres://')
    ? `postgresql://${connectionString.slice('postgres://'.length)}`
    : connectionString
  return new URL(normalized).hostname
}

function buildPoolConfig(): PoolConfig {
  const rawConnectionString = requiredEnv('DATABASE_URL')
  const ca = sslCaFromEnv()
  const connectionString = ca ? connectionStringWithoutSslQueryParams(rawConnectionString) : rawConnectionString
  const config: PoolConfig = {
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5_000),
  }
  if (ca) {
    const host = hostnameFromConnectionString(connectionString)
    const servername = process.env.DATABASE_SSL_SERVERNAME?.trim()
    if ((host === 'localhost' || host === '127.0.0.1') && !servername) {
      throw new Error(
        'Set DATABASE_SSL_SERVERNAME when DATABASE_URL uses localhost/127.0.0.1 with DATABASE_SSL_CA (e.g. Cloud SQL Auth Proxy). Use the TLS certificate SAN hostname (…REGION.sql.goog from the server cert or Cloud SQL connection UI).',
      )
    }
    config.ssl = {
      rejectUnauthorized: true,
      ca,
      ...(servername ? { servername } : {}),
    }
  }
  return config
}

export const dbPool = new Pool(buildPoolConfig())

export async function checkDbConnection(): Promise<void> {
  const client = await dbPool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}

export async function closeDbConnection(): Promise<void> {
  await dbPool.end()
}
