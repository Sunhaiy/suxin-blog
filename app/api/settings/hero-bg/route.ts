/**
 * app/api/settings/hero-bg/route.ts
 *
 * GET /api/settings/hero-bg — 获取 Hero 背景图 URL
 * POST /api/settings/hero-bg — 上传 Hero 背景图（需鉴权）
 * DELETE /api/settings/hero-bg — 删除 Hero 背景图（需鉴权）
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import sharp from 'sharp'
import { storage } from '@/lib/storage/LocalStorage'
import { getSetting, setSetting } from '@/lib/db/dao/settingsDao'
import { SETTINGS_KEYS } from '@/lib/constants/settings'

export async function GET() {
  try {
    const settings = await getSetting(SETTINGS_KEYS.HERO_BG)
    const heroBgUrl = typeof settings?.url === 'string' ? settings.url : null
    return NextResponse.json({ url: heroBgUrl })
  } catch (error) {
    console.error('Failed to fetch hero background:', error)
    return NextResponse.json({ url: null })
  }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // 验证文件类型
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })
  }

  // 验证文件大小（最大 50MB 用于背景图）
  const MAX_SIZE_MB = 50
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > MAX_SIZE_MB) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // 使用 sharp 验证和优化图片
    const image = sharp(buffer)
    const meta = await image.metadata()

    // 确保宽度不小于 1920px（Hero 背景要求）
    if ((meta.width ?? 0) < 1920) {
      return NextResponse.json(
        { error: 'Image width must be at least 1920px' },
        { status: 400 }
      )
    }

    // 上传到存储服务
    const uploadResult = await storage.upload(buffer, file.name, file.type, 'hero')

    // 保存到数据库 settings
    await setSetting(
      SETTINGS_KEYS.HERO_BG,
      { url: uploadResult.url, fileName: uploadResult.fileName },
      'Hero section background image'
    )

    return NextResponse.json(
      { url: uploadResult.url, message: 'Hero background updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to upload hero background:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await setSetting(SETTINGS_KEYS.HERO_BG, { url: null }, 'Hero background removed')
    return NextResponse.json({ message: 'Hero background deleted' })
  } catch (error) {
    console.error('Failed to delete hero background:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
