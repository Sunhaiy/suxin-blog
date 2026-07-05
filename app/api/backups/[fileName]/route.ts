import { createReadStream, promises as fs } from 'node:fs'
import { Readable } from 'node:stream'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { getBackupFilePath } from '@/lib/backup/siteBackup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fileName } = await params
    const decodedName = decodeURIComponent(fileName)
    const filePath = getBackupFilePath(decodedName)
    const stat = await fs.stat(filePath)
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${decodedName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return NextResponse.json({ error: '备份文件不存在' }, { status: 404 })
    }
    console.error('[backup] Download failed:', error)
    return NextResponse.json({ error: '下载备份失败' }, { status: 400 })
  }
}

