import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { createSiteBackup, listSiteBackups } from '@/lib/backup/siteBackup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json({
      backups: await listSiteBackups(),
      policy: {
        automaticRetention: 3,
        schedule: process.env.SITE_BACKUP_CRON ?? '30 3 * * *',
        timezone: process.env.SITE_BACKUP_TIMEZONE ?? 'Asia/Shanghai',
        includes: ['database', 'uploads'],
      },
    })
  } catch (error) {
    console.error('[backup] Failed to list backups:', error)
    return NextResponse.json({ error: '读取备份列表失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const backup = await createSiteBackup('manual')
    return NextResponse.json({ backup }, { status: 201 })
  } catch (error) {
    console.error('[backup] Manual backup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建备份失败' },
      { status: 500 }
    )
  }
}

