import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { storage } from '@/lib/storage/LocalStorage'

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
const MAX_SIZE = 200 * 1024 * 1024

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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 200MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await storage.upload(buffer, file.name, file.type, 'lifestyle')

  return NextResponse.json({
    url: result.url,
    fileName: result.fileName,
    fileSize: result.fileSize,
    mimeType: result.mimeType,
  })
}
