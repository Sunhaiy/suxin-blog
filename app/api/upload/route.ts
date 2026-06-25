/**
 * app/api/upload/route.ts
 *
 * POST /api/upload — 上传媒体文件（需鉴权）
 *
 * 流程:
 *   1. 读取 FormData 中的 file 字段
 *   2. 校验类型和大小
 *   3. 通过 sharp 生成缩略图
 *   4. 用 exifr 解析 EXIF 数据
 *   5. 调用 StorageService 保存到本地磁盘
 *   6. 写入 gallery_items 数据库记录
 *   7. 返回 GalleryItem
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import sharp from 'sharp'
import * as exifr from 'exifr'
import { storage } from '@/lib/storage/LocalStorage'
import { insertGalleryItem } from '@/lib/db/dao/galleryDao'
import type { ExifData } from '@/types/gallery'

const MAX_SIZE_MB = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

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

  // 校验类型
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })
  }

  // 校验大小
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > MAX_SIZE_MB) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── 解析 EXIF ──────────────────────────────────────────────
  let exifData: ExifData | null = null
  try {
    const raw = await exifr.parse(buffer, {
      tiff: true, exif: true, gps: true,
      pick: [
        'Make', 'Model', 'LensModel', 'FocalLength', 'FocalLengthIn35mmFormat',
        'FNumber', 'ExposureTime', 'ISO', 'Flash', 'Software',
        'DateTimeOriginal', 'latitude', 'longitude', 'GPSAltitude'
      ]
    })
    if (raw) {
      exifData = {
        make: raw.Make ?? null,
        model: raw.Model ?? null,
        lensModel: raw.LensModel ?? null,
        focalLength: raw.FocalLength ?? null,
        focalLengthIn35mm: raw.FocalLengthIn35mmFormat ?? null,
        aperture: raw.FNumber ?? null,
        shutterSpeed: raw.ExposureTime ? `1/${Math.round(1 / raw.ExposureTime)}` : null,
        iso: raw.ISO ?? null,
        flash: raw.Flash ?? null,
        software: raw.Software ?? null,
        dateTimeOriginal: raw.DateTimeOriginal?.toISOString() ?? null,
        gpsLatitude: raw.latitude ?? null,
        gpsLongitude: raw.longitude ?? null,
        gpsAltitude: raw.GPSAltitude ?? null,
      }
    }
  } catch {
    // EXIF 解析失败不阻塞上传
  }

  // ── sharp 读取尺寸 & 生成缩略图 ────────────────────────────
  let width: number | undefined
  let height: number | undefined
  let thumbnailBuffer: Buffer | undefined

  try {
    const image = sharp(buffer)
    const meta = await image.metadata()
    width = meta.width
    height = meta.height

    thumbnailBuffer = await image
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer()
  } catch {
    // 缩略图生成失败不阻塞
  }

  // ── 存储原始文件 ─────────────────────────────────────────────
  const uploadResult = await storage.upload(buffer, file.name, file.type, 'gallery')

  // ── 存储缩略图 ───────────────────────────────────────────────
  let thumbnailUrl: string | undefined
  if (thumbnailBuffer) {
    const thumbResult = await storage.upload(
      thumbnailBuffer,
      `thumb_${file.name}`,
      'image/webp',
      'gallery/thumbs'
    )
    thumbnailUrl = thumbResult.url
  }

  // ── 写入数据库 ───────────────────────────────────────────────
  const item = await insertGalleryItem({
    url: uploadResult.url,
    thumbnailUrl,
    fileName: uploadResult.fileName,
    fileSize: uploadResult.fileSize,
    width,
    height,
    exif: exifData ?? undefined,
    category: ((formData.get('category') as string) ?? 'photo') as import('@/types/gallery').GalleryCategory,
    title: (formData.get('title') as string) ?? undefined,
    description: (formData.get('description') as string) ?? undefined,
    tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
  })

  return NextResponse.json(item, { status: 201 })
}
