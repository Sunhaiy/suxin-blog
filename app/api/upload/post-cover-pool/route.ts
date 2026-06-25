import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { storage } from '@/lib/storage/LocalStorage'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const metadata = await sharp(buffer).metadata().catch(() => null)
  const result = await storage.upload(buffer, file.name, file.type, 'post-cover-pool')

  return NextResponse.json({
    url: result.url,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
    mimeType: result.mimeType,
    fileSize: result.fileSize,
  })
}
