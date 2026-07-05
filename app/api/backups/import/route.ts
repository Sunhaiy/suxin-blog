import { promises as fs } from 'node:fs'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import {
  createIncomingBackupPath,
  restoreSiteBackup,
} from '@/lib/backup/siteBackup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!req.body) {
    return NextResponse.json({ error: '请选择备份文件' }, { status: 400 })
  }

  const maximumBytes = Number(process.env.BACKUP_MAX_BYTES ?? 10 * 1024 ** 3)
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > maximumBytes) {
    return NextResponse.json({ error: '备份文件超过允许大小' }, { status: 413 })
  }

  const incomingPath = await createIncomingBackupPath()
  const file = await fs.open(incomingPath, 'wx')
  let receivedBytes = 0

  try {
    const reader = req.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maximumBytes) {
        throw new Error('备份文件超过允许大小')
      }
      await file.write(value)
    }
    await file.close()

    if (receivedBytes === 0) throw new Error('备份文件为空')
    const result = await restoreSiteBackup(incomingPath)
    revalidatePath('/', 'layout')
    return NextResponse.json({ result })
  } catch (error) {
    await file.close().catch(() => undefined)
    console.error('[backup] Import failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导入备份失败' },
      { status: 400 }
    )
  } finally {
    await fs.rm(incomingPath, { force: true })
  }
}

