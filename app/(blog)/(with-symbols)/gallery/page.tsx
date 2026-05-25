import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ImmersiveGallery } from '@/components/ui/ImmersiveGallery'
import { findGalleryAlbums } from '@/lib/db/dao/galleryAlbumDao'
import { findGalleryItems } from '@/lib/db/dao/galleryDao'

export const metadata: Metadata = {
  title: '相册',
  description: '用沉浸式横向画廊浏览收藏的照片与画面。',
}

export const revalidate = 600

export default async function GalleryPage() {
  const userAgent = (await headers()).get('user-agent') ?? ''
  const initialMobileLayout = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(userAgent)

  const [{ data: items }, albums] = await Promise.all([
    findGalleryItems({
      page: 1,
      pageSize: 120,
    }),
    findGalleryAlbums(),
  ])

  return (
    <ImmersiveGallery
      items={items}
      albums={albums}
      initialMobileLayout={initialMobileLayout}
    />
  )
}
