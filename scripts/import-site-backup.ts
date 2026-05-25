import fs from 'node:fs'
import path from 'node:path'
import { Pool, type PoolClient } from 'pg'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const TABLE_ORDER = [
  'settings',
  'link_categories',
  'posts',
  'moments',
  'moment_likes',
  'moment_comments',
  'animes',
  'games',
  'gallery_albums',
  'gallery_items',
  'comments',
  'links',
  'link_submissions',
  'works',
] as const

type TableName = (typeof TABLE_ORDER)[number]

interface BackupPayload {
  exportedAt: string
  source: string
  tables: Partial<Record<TableName, Record<string, unknown>[]>>
}

const JSON_COLUMNS: Partial<Record<TableName, Set<string>>> = {
  posts: new Set(['content']),
  moments: new Set(['content_json', 'meta']),
  gallery_items: new Set(['exif']),
  settings: new Set(['value']),
  works: new Set(['contributors_json', 'milestones_json', 'gallery_json']),
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function getSslConfig() {
  const mode = (process.env.PGSSLMODE ?? '').toLowerCase()
  const url = (process.env.DATABASE_URL ?? '').toLowerCase()
  const enabled =
    process.env.DATABASE_SSL === 'true' ||
    url.includes('sslmode=require') ||
    url.includes('ssl=true') ||
    ['require', 'verify-ca', 'verify-full'].includes(mode)

  if (!enabled) return false

  return {
    rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === 'true',
  }
}

async function resetSequence(client: PoolClient, table: string) {
  const sequenceQuery = `
    SELECT pg_get_serial_sequence($1, 'id') AS seq
  `
  const seqResult = await client.query<{ seq: string | null }>(sequenceQuery, [table])
  const sequenceName = seqResult.rows[0]?.seq
  if (!sequenceName) return

  const maxIdQuery = `SELECT COALESCE(MAX(id), 0)::int AS max_id FROM ${quoteIdentifier(table)}`
  const maxIdResult = await client.query<{ max_id: number }>(maxIdQuery)
  const maxId = maxIdResult.rows[0]?.max_id ?? 0

  await client.query('SELECT setval($1, $2, $3)', [sequenceName, maxId > 0 ? maxId : 1, maxId > 0])
}

async function insertRows(client: PoolClient, table: string, rows: Record<string, unknown>[]) {
  const jsonColumns = JSON_COLUMNS[table as TableName] ?? new Set<string>()

  for (const row of rows) {
    const columns = Object.keys(row)
    if (columns.length === 0) continue

    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
    const values = columns.map((column) => {
      const value = row[column]
      if (jsonColumns.has(column)) {
        return JSON.stringify(value ?? null)
      }
      return value
    })
    const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`

    await client.query(sql, values)
  }

  if (rows.some((row) => Object.prototype.hasOwnProperty.call(row, 'id'))) {
    await resetSequence(client, table)
  }
}

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))
  loadEnv(path.join(process.cwd(), '.env'))
  loadEnv(path.join(process.cwd(), '.env.production'))

  const backupPathArg = process.argv[2]
  if (!backupPathArg) {
    throw new Error('Usage: npm run backup:import -- <backup-file.json>')
  }

  const backupPath = path.resolve(process.cwd(), backupPathArg)
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  const payload = JSON.parse(fs.readFileSync(backupPath, 'utf-8')) as BackupPayload
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getSslConfig(),
  })

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const truncateTables = [...TABLE_ORDER].reverse().join(', ')
    await client.query(`TRUNCATE TABLE ${truncateTables} RESTART IDENTITY CASCADE`)

    for (const table of TABLE_ORDER) {
      const rows = payload.tables[table] ?? []
      if (!rows.length) continue
      await insertRows(client, table, rows)
    }

    await client.query('COMMIT')
    console.log(`[backup] Imported backup from ${backupPath}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('[backup] Import failed:', error)
  process.exit(1)
})
