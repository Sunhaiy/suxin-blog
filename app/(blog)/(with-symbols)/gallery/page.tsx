import { publicPageMetadata } from '@/lib/seo/metadata'
import { headers } from 'next/headers'
import { ImmersiveGallery } from '@/components/ui/ImmersiveGallery'
import { findGalleryAlbums } from '@/lib/db/dao/galleryAlbumDao'
import { findGalleryItems } from '@/lib/db/dao/galleryDao'

export const metadata = publicPageMetadata('/gallery')

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
    <>
      <h1 className="sr-only">摄影相册与生活影像</h1>
      <ImmersiveGallery
        items={items}
        albums={albums}
        initialMobileLayout={initialMobileLayout}
      />
    </>
  )
}
