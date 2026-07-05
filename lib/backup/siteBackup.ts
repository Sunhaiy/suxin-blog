import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import pool, { query } from '@/lib/db'

const execFileAsync = promisify(execFile)

export const BACKUP_TABLE_ORDER = [
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

export type BackupKind = 'automatic' | 'manual' | 'safety'
type TableName = (typeof BACKUP_TABLE_ORDER)[number]

export interface BackupFileInfo {
  name: string
  kind: BackupKind
  size: number
  createdAt: string
}

interface BackupPayload {
  version: 1
  exportedAt: string
  source: 'suxin-blog'
  tableOrder: readonly TableName[]
  tables: Partial<Record<TableName, Record<string, unknown>[]>>
}

interface BackupManifest {
  format: 'suxin-site-backup'
  version: 1
  createdAt: string
  kind: BackupKind
  databaseFile: 'database.json'
  uploadsEntry: string
  includesUploads: true
  tableCounts: Record<string, number>
  mediaFiles: number
  mediaBytes: number
}

const JSON_COLUMNS: Partial<Record<TableName, Set<string>>> = {
  posts: new Set(['content']),
  moments: new Set(['content_json', 'meta']),
  gallery_items: new Set(['exif']),
  settings: new Set(['value']),
  works: new Set(['contributors_json', 'milestones_json', 'gallery_json']),
}

const BACKUP_FILE_PATTERN =
  /^site-backup-(automatic|manual|safety)-(\d{8}T\d{9}Z)\.tar\.gz$/

let operationQueue: Promise<void> = Promise.resolve()

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(task, task)
  operationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function getBackupDir() {
  return path.resolve(process.env.BACKUP_DIR ?? path.join(process.cwd(), 'data', 'backups'))
}

function getUploadDir() {
  return path.resolve(
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')
  )
}

function archiveTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('.', '')
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function runTar(args: string[]) {
  const command = process.platform === 'win32' ? 'tar.exe' : 'tar'
  return execFileAsync(command, args, {
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
}

async function directoryStats(root: string) {
  let files = 0
  let bytes = 0

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
      } else if (entry.isFile()) {
        const stat = await fs.stat(absolute)
        files += 1
        bytes += stat.size
      }
    }
  }

  try {
    await walk(root)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  return { files, bytes }
}

async function exportDatabase(): Promise<BackupPayload> {
  const tables: BackupPayload['tables'] = {}

  for (const table of BACKUP_TABLE_ORDER) {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1 ASC`
    )
    tables[table] = rows.rows
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'suxin-blog',
    tableOrder: BACKUP_TABLE_ORDER,
    tables,
  }
}

async function pruneBackups(kind: BackupKind, keep: number) {
  const backups = (await listSiteBackups()).filter((item) => item.kind === kind)
  await Promise.all(
    backups.slice(keep).map((item) => fs.rm(getBackupFilePath(item.name), { force: true }))
  )
}

async function createSiteBackupUnlocked(kind: BackupKind): Promise<BackupFileInfo> {
  const backupDir = getBackupDir()
  const uploadDir = getUploadDir()
  const createdAt = new Date()
  const fileName = `site-backup-${kind}-${archiveTimestamp(createdAt)}.tar.gz`
  const finalPath = path.join(backupDir, fileName)
  const temporaryArchive = `${finalPath}.tmp-${randomUUID()}`
  const stageDir = path.join(backupDir, `.stage-${randomUUID()}`)

  await fs.mkdir(backupDir, { recursive: true })
  await fs.mkdir(stageDir, { recursive: true })

  try {
    const payload = await exportDatabase()
    const media = await directoryStats(uploadDir)
    const uploadsEntry = path.basename(uploadDir)
    const tableCounts = Object.fromEntries(
      BACKUP_TABLE_ORDER.map((table) => [table, payload.tables[table]?.length ?? 0])
    )
    const manifest: BackupManifest = {
      format: 'suxin-site-backup',
      version: 1,
      createdAt: createdAt.toISOString(),
      kind,
      databaseFile: 'database.json',
      uploadsEntry,
      includesUploads: true,
      tableCounts,
      mediaFiles: media.files,
      mediaBytes: media.bytes,
    }

    await Promise.all([
      fs.writeFile(
        path.join(stageDir, 'database.json'),
        JSON.stringify(payload),
        'utf8'
      ),
      fs.writeFile(
        path.join(stageDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      ),
    ])

    try {
      await fs.access(uploadDir)
      await runTar([
        '-czf',
        temporaryArchive,
        '-C',
        stageDir,
        'manifest.json',
        'database.json',
        '-C',
        path.dirname(uploadDir),
        uploadsEntry,
      ])
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await fs.mkdir(path.join(stageDir, uploadsEntry), { recursive: true })
      await runTar(['-czf', temporaryArchive, '-C', stageDir, '.'])
    }

    await fs.rename(temporaryArchive, finalPath)
    await pruneBackups(kind, kind === 'safety' ? 1 : 3)

    const stat = await fs.stat(finalPath)
    return {
      name: fileName,
      kind,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    }
  } finally {
    await Promise.all([
      fs.rm(stageDir, { recursive: true, force: true }),
      fs.rm(temporaryArchive, { force: true }),
    ])
  }
}

export function createSiteBackup(kind: BackupKind = 'manual') {
  return runExclusive(() => createSiteBackupUnlocked(kind))
}

export async function listSiteBackups(): Promise<BackupFileInfo[]> {
  const backupDir = getBackupDir()
  await fs.mkdir(backupDir, { recursive: true })
  const entries = await fs.readdir(backupDir, { withFileTypes: true })
  const backups: BackupFileInfo[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const match = entry.name.match(BACKUP_FILE_PATTERN)
    if (!match) continue
    const stat = await fs.stat(path.join(backupDir, entry.name))
    backups.push({
      name: entry.name,
      kind: match[1] as BackupKind,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    })
  }

  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getBackupFilePath(fileName: string) {
  if (!BACKUP_FILE_PATTERN.test(fileName)) {
    throw new Error('无效的备份文件名')
  }

  const backupDir = getBackupDir()
  const resolved = path.resolve(backupDir, fileName)
  if (path.dirname(resolved) !== backupDir) {
    throw new Error('无效的备份文件路径')
  }
  return resolved
}

export async function createIncomingBackupPath() {
  const backupDir = getBackupDir()
  await fs.mkdir(backupDir, { recursive: true })
  return path.join(backupDir, `.incoming-${randomUUID()}.tar.gz`)
}

function validateArchiveEntries(entries: string[]) {
  for (const rawEntry of entries) {
    const entry = rawEntry.trim().replace(/\\/g, '/')
    if (!entry) continue
    if (entry.startsWith('/') || entry.split('/').includes('..')) {
      throw new Error('备份包包含不安全的文件路径')
    }
  }
}

function validateArchiveEntryTypes(entries: string[]) {
  for (const entry of entries) {
    if (!entry.trim()) continue
    const type = entry[0]
    if (type !== '-' && type !== 'd') {
      throw new Error('备份包不能包含符号链接或特殊文件')
    }
  }
}

function validatePayload(value: unknown): BackupPayload {
  if (!value || typeof value !== 'object') throw new Error('数据库备份格式无效')
  const payload = value as Partial<BackupPayload>
  if (payload.source !== 'suxin-blog' || payload.version !== 1) {
    throw new Error('该文件不是受支持的素心博客备份')
  }
  if (!payload.tables || typeof payload.tables !== 'object') {
    throw new Error('备份中缺少数据库内容')
  }
  return payload as BackupPayload
}

async function resetSequence(client: import('pg').PoolClient, table: string) {
  const result = await client.query<{ seq: string | null }>(
    `SELECT pg_get_serial_sequence($1, 'id') AS seq`,
    [table]
  )
  const sequence = result.rows[0]?.seq
  if (!sequence) return

  const maxResult = await client.query<{ max_id: number }>(
    `SELECT COALESCE(MAX(id), 0)::int AS max_id FROM ${quoteIdentifier(table)}`
  )
  const maxId = maxResult.rows[0]?.max_id ?? 0
  await client.query('SELECT setval($1, $2, $3)', [
    sequence,
    maxId > 0 ? maxId : 1,
    maxId > 0,
  ])
}

async function insertRows(
  client: import('pg').PoolClient,
  table: TableName,
  rows: Record<string, unknown>[]
) {
  const jsonColumns = JSON_COLUMNS[table] ?? new Set<string>()

  for (const row of rows) {
    const columns = Object.keys(row)
    if (columns.length === 0) continue
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
    const values = columns.map((column) => {
      const value = row[column]
      return jsonColumns.has(column) ? JSON.stringify(value ?? null) : value
    })
    await client.query(
      `INSERT INTO ${quoteIdentifier(table)} (${columns
        .map(quoteIdentifier)
        .join(', ')}) VALUES (${placeholders})`,
      values
    )
  }

  if (rows.some((row) => Object.prototype.hasOwnProperty.call(row, 'id'))) {
    await resetSequence(client, table)
  }
}

async function importDatabase(payload: BackupPayload) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `TRUNCATE TABLE ${BACKUP_TABLE_ORDER.map(quoteIdentifier).join(
        ', '
      )} RESTART IDENTITY CASCADE`
    )

    for (const table of BACKUP_TABLE_ORDER) {
      await insertRows(client, table, payload.tables[table] ?? [])
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function moveDirectoryContents(source: string, destination: string) {
  await fs.mkdir(destination, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    await fs.rename(path.join(source, entry.name), path.join(destination, entry.name))
  }
}

async function clearDirectoryExcept(root: string, exceptName: string) {
  const entries = await fs.readdir(root, { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => entry.name !== exceptName)
      .map((entry) =>
        fs.rm(path.join(root, entry.name), { recursive: true, force: true })
      )
  )
}

async function restoreUploadsAndDatabase(
  extractedUploads: string,
  payload: BackupPayload
) {
  const uploadDir = getUploadDir()
  const rollbackName = `.restore-previous-${randomUUID()}`
  const rollbackDir = path.join(uploadDir, rollbackName)

  await fs.mkdir(uploadDir, { recursive: true })
  await fs.mkdir(rollbackDir, { recursive: true })

  const previousEntries = (await fs.readdir(uploadDir, { withFileTypes: true })).filter(
    (entry) => entry.name !== rollbackName
  )
  for (const entry of previousEntries) {
    await fs.rename(
      path.join(uploadDir, entry.name),
      path.join(rollbackDir, entry.name)
    )
  }

  try {
    const restoredEntries = await fs.readdir(extractedUploads, { withFileTypes: true })
    for (const entry of restoredEntries) {
      await fs.cp(path.join(extractedUploads, entry.name), path.join(uploadDir, entry.name), {
        recursive: true,
        preserveTimestamps: true,
      })
    }

    await importDatabase(payload)
    await fs.rm(rollbackDir, { recursive: true, force: true }).catch((error) => {
      console.error('[backup] Failed to remove restored media rollback directory:', error)
    })
  } catch (error) {
    await clearDirectoryExcept(uploadDir, rollbackName)
    await moveDirectoryContents(rollbackDir, uploadDir)
    await fs.rm(rollbackDir, { recursive: true, force: true })
    throw error
  }
}

async function restoreSiteBackupUnlocked(archivePath: string) {
  const backupDir = getBackupDir()
  const extractDir = path.join(backupDir, `.restore-${randomUUID()}`)
  await fs.mkdir(extractDir, { recursive: true })

  try {
    const { stdout } = await runTar(['-tzf', archivePath])
    validateArchiveEntries(stdout.split(/\r?\n/))
    const { stdout: verboseListing } = await runTar(['-tvzf', archivePath])
    validateArchiveEntryTypes(verboseListing.split(/\r?\n/))
    await runTar(['-xzf', archivePath, '-C', extractDir])

    const manifest = JSON.parse(
      await fs.readFile(path.join(extractDir, 'manifest.json'), 'utf8')
    ) as BackupManifest
    if (manifest.format !== 'suxin-site-backup' || manifest.version !== 1) {
      throw new Error('备份清单格式不受支持')
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(manifest.uploadsEntry)) {
      throw new Error('备份清单中的媒体目录无效')
    }

    const payload = validatePayload(
      JSON.parse(await fs.readFile(path.join(extractDir, manifest.databaseFile), 'utf8'))
    )
    const extractedUploads = path.join(extractDir, manifest.uploadsEntry)
    const uploadStat = await fs.stat(extractedUploads)
    if (!uploadStat.isDirectory()) throw new Error('备份中缺少媒体目录')

    await createSiteBackupUnlocked('safety')
    await restoreUploadsAndDatabase(extractedUploads, payload)

    return {
      restoredAt: new Date().toISOString(),
      sourceCreatedAt: manifest.createdAt,
      tableCounts: manifest.tableCounts,
      mediaFiles: manifest.mediaFiles,
      mediaBytes: manifest.mediaBytes,
    }
  } finally {
    await fs.rm(extractDir, { recursive: true, force: true })
  }
}

export function restoreSiteBackup(archivePath: string) {
  return runExclusive(() => restoreSiteBackupUnlocked(archivePath))
}

export async function ensureRecentAutomaticBackup(maxAgeHours = 20) {
  const latest = (await listSiteBackups()).find((item) => item.kind === 'automatic')
  if (
    latest &&
    Date.now() - new Date(latest.createdAt).getTime() < maxAgeHours * 60 * 60 * 1000
  ) {
    return latest
  }
  return createSiteBackup('automatic')
}
