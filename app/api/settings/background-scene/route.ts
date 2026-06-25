import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { storage } from '@/lib/storage/LocalStorage'
import {
  getBackgroundSceneSettings,
  normalizeBackgroundSceneSettings,
  persistBackgroundSceneSettings,
} from '@/lib/scene'
import { backgroundSceneSchema } from '@/lib/validation/scene'

export async function GET() {
  const scene = await getBackgroundSceneSettings()
  return NextResponse.json(scene)
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = backgroundSceneSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const scene = normalizeBackgroundSceneSettings(parsed.data, parsed.data.image.url ?? null)
  await persistBackgroundSceneSettings(scene)
  return NextResponse.json(scene)
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

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 415 })
  }

  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > 50) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const image = sharp(buffer)
    const meta = await image.metadata()

    if ((meta.width ?? 0) < 1920) {
      return NextResponse.json(
        { error: 'Image width must be at least 1920px' },
        { status: 400 }
      )
    }

    const upload = await storage.upload(buffer, file.name, file.type, 'scene')
    const current = await getBackgroundSceneSettings()
    const next = normalizeBackgroundSceneSettings(
      {
        ...current,
        image: {
          ...current.image,
          url: upload.url,
        },
      },
      upload.url
    )

    await persistBackgroundSceneSettings(next)
    return NextResponse.json(next)
  } catch (error) {
    console.error('[background-scene.upload]', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const current = await getBackgroundSceneSettings()
  const next = normalizeBackgroundSceneSettings(
    {
      ...current,
      image: {
        ...current.image,
        url: null,
      },
    },
    null
  )

  await persistBackgroundSceneSettings(next)
  return NextResponse.json(next)
}
