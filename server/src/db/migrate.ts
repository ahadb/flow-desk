import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDbConnection, dbPool } from './connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

type MigrationFile = {
  name: string
  sql: string
}

async function ensureMigrationsTable(): Promise<void> {
  await dbPool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)
}

async function readMigrations(): Promise<MigrationFile[]> {
  const files = await readdir(MIGRATIONS_DIR)
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()
  const migrations = await Promise.all(
    sqlFiles.map(async (name) => ({
      name,
      sql: await readFile(path.join(MIGRATIONS_DIR, name), 'utf8'),
    })),
  )
  return migrations
}

async function appliedMigrationNames(): Promise<Set<string>> {
  const result = await dbPool.query<{ name: string }>('select name from schema_migrations order by name asc')
  return new Set(result.rows.map((row) => row.name))
}

async function applyMigration(migration: MigrationFile): Promise<void> {
  const client = await dbPool.connect()
  try {
    await client.query('begin')
    await client.query(migration.sql)
    await client.query('insert into schema_migrations(name) values ($1)', [migration.name])
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function run(): Promise<void> {
  await ensureMigrationsTable()
  const allMigrations = await readMigrations()
  const alreadyApplied = await appliedMigrationNames()

  let appliedCount = 0
  for (const migration of allMigrations) {
    if (alreadyApplied.has(migration.name)) continue
    await applyMigration(migration)
    appliedCount += 1
    console.log(`Applied migration: ${migration.name}`)
  }
  if (appliedCount === 0) {
    console.log('No pending migrations.')
  } else {
    console.log(`Applied ${appliedCount} migration(s).`)
  }
}

run()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDbConnection()
  })
