// 一次性脚本：把 links 表里「外链头像」下载并存到本地 /uploads/links/，再更新 avatar_url。
// 设计为可在生产 app 容器内直接用 node 运行（依赖 pg + 全局 fetch，均为生产环境已有）。
//
// 用法（容器内）：
//   node scripts/migrate-link-avatars.mjs --dry-run   # 仅预览，不改任何东西
//   node scripts/migrate-link-avatars.mjs             # 实际执行
//
// 行为：仅处理 avatar_url 为 http(s) 外链的行；本地(/开头)跳过；
// 下载失败/非图片/超限一律保留原值，绝不丢头像。

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import pkg from 'pg'

const { Client } = pkg

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
}

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_PATH = process.env.UPLOAD_PUBLIC_PATH ?? '/uploads'

function buildClient() {
  if (process.env.DATABASE_URL) return new Client({ connectionString: process.env.DATABASE_URL })
  return new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  })
}

function isExternal(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim())
}

async function downloadAndSave(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  let res
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SuxinBlog/1.0; +avatar migrate)',
        Accept: 'image/*',
      },
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!ALLOWED.has(mime)) throw new Error(`非图片类型: ${mime || '未知'}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0 || buf.length > MAX_BYTES) throw new Error(`体积异常: ${buf.length}B`)

  const now = new Date()
  const dateDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const targetDir = path.join(UPLOAD_DIR, 'links', dateDir)
  let ext = ''
  try {
    ext = path.extname(new URL(url).pathname).toLowerCase()
  } catch {
    ext = ''
  }
  if (!ext || ext.length > 5) ext = EXT_BY_MIME[mime] || '.img'
  const fileName = `${crypto.randomBytes(8).toString('hex')}${ext}`

  if (!DRY_RUN) {
    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(path.join(targetDir, fileName), buf)
  }
  return path.posix.join(PUBLIC_PATH, 'links', dateDir, fileName)
}

async function main() {
  console.log(`[migrate-link-avatars] ${DRY_RUN ? 'DRY-RUN（仅预览）' : '实际执行'}`)
  console.log(`  UPLOAD_DIR=${UPLOAD_DIR}  PUBLIC_PATH=${PUBLIC_PATH}`)
  const client = buildClient()
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT id, name, avatar_url FROM links WHERE avatar_url IS NOT NULL AND avatar_url <> '' ORDER BY id`
    )
    let total = 0
    let migrated = 0
    let skipped = 0
    let failed = 0
    for (const row of rows) {
      total += 1
      if (!isExternal(row.avatar_url)) {
        skipped += 1
        continue
      }
      try {
        const localUrl = await downloadAndSave(row.avatar_url)
        if (!DRY_RUN) {
          await client.query('UPDATE links SET avatar_url = $1 WHERE id = $2', [localUrl, row.id])
        }
        migrated += 1
        console.log(`  ✓ #${row.id} ${row.name}: ${row.avatar_url}  ->  ${localUrl}`)
      } catch (err) {
        failed += 1
        console.log(`  ✗ #${row.id} ${row.name}: 保留原链（${err.message}）`)
      }
    }
    console.log(
      `\n完成：共 ${total} 条，外链已${DRY_RUN ? '可' : ''}迁移 ${migrated}，本地跳过 ${skipped}，失败保留 ${failed}。`
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('迁移脚本异常:', err)
  process.exit(1)
})
