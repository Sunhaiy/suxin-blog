/**
 * lib/db/migrate.ts
 *
 * 数据库迁移脚本。
 * 执行方式: npm run db:migrate
 *
 * 策略: 读取 schema.sql 并在数据库执行（CREATE IF NOT EXISTS），
 * 幂等安全，可重复运行。
 */

import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

// 加载 .env.local 文件（无需额外包）
function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
        .replace(/^["']|["']$/g, '')  // 移除首尾引号
        .replace(/\\n/g, '\n')             // 处理转义序列
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
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

async function migrate() {
  const envPath = path.join(process.cwd(), '.env.local')
  loadEnv(envPath)
  loadEnv(path.join(process.cwd(), '.env'))
  loadEnv(path.join(process.cwd(), '.env.production'))

  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql')

  if (!fs.existsSync(schemaPath)) {
    console.error('[migrate] schema.sql not found at:', schemaPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('[migrate] DATABASE_URL not set. Check .env.local file.')
    process.exit(1)
  }

  console.log('[migrate] Using DATABASE_URL:', databaseUrl.replace(/:[^:]+@/, ':***@'))

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getSslConfig(),
  })

  const client = await pool.connect()
  try {
    console.log('[migrate] Running schema migration...')
    await client.query(sql)
    console.log('[migrate] Done. All tables are up to date.')
  } catch (err) {
    console.error('[migrate] Migration failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()


