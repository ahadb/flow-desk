import 'dotenv/config'
import { Pool, type PoolConfig } from 'pg'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function buildPoolConfig(): PoolConfig {
  return {
    connectionString: requiredEnv('DATABASE_URL'),
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5_000),
  }
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
