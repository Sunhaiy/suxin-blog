import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { deleteGalleryAlbum, findGalleryAlbums, insertGalleryAlbum } from '@/lib/db/dao/galleryAlbumDao'

const createAlbumSchema = z.object({
  name: z.string().trim().min(1, 'Album name is required'),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const albums = await findGalleryAlbums()
  return NextResponse.json(albums)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createAlbumSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const album = await insertGalleryAlbum(parsed.data)
  return NextResponse.json(album, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid album id' }, { status: 400 })
  }

  await deleteGalleryAlbum(id)
  return new NextResponse(null, { status: 204 })
}
