import fs from 'node:fs'
import path from 'node:path'

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

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))
  const { query } = await import('../lib/db')

  const tables = [
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
  ]

  const result: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    source: 'lihuahaimax',
    tableOrder: tables,
    tables: {},
  }

  for (const table of tables) {
    const rows = await query(`SELECT * FROM ${table} ORDER BY 1 ASC`)
    result.tables = {
      ...(result.tables as Record<string, unknown>),
      [table]: rows.rows,
    }
  }

  const backupDir = path.join(process.cwd(), 'backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const filePath = path.join(backupDir, `site-backup-${timestamp()}.json`)
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8')

  console.log(`[backup] Exported site data to ${filePath}`)
}

main().catch((error) => {
  console.error('[backup] Failed:', error)
  process.exit(1)
})
