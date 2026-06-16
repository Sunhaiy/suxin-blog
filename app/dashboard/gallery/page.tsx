'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ADMIN_INPUT_CLASS,
  AdminEmptyState,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
} from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { GalleryImageSkeleton } from '@/components/ui/Skeleton'
import {
  useCreateGalleryAlbum,
  useDeleteGalleryAlbum,
  useDeleteGalleryItem,
  useGalleryAlbums,
  useGalleryItems,
  useUpdateGalleryItem,
  useUploadImage,
} from '@/features/gallery/hooks'

type GalleryDashboardAlbum = {
  id: number
  name: string
  slug: string
  description: string | null
}

type GalleryDashboardItem = {
  id: number
  thumbnail_url: string | null
  url: string
  file_name: string
  title: string | null
  description: string | null
  album_id: number | null
}

export default function DashboardGalleryPage() {
  const { data, isLoading, mutate } = useGalleryItems({ pageSize: 60 })
  const { data: albumData, isLoading: albumsLoading, mutate: mutateAlbums } = useGalleryAlbums()
  const { trigger: upload, isMutating: uploading } = useUploadImage()
  const { trigger: createAlbum, isMutating: creatingAlbum } = useCreateGalleryAlbum()
  const { trigger: deleteAlbum, isMutating: deletingAlbum } = useDeleteGalleryAlbum()
  const { trigger: deleteItem } = useDeleteGalleryItem()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [albumName, setAlbumName] = useState('')
  const [albumSlug, setAlbumSlug] = useState('')

  const items = (data?.data ?? []) as GalleryDashboardItem[]
  const albums = (albumData ?? []) as GalleryDashboardAlbum[]

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    setError('')
    try {
      for (const file of files) {
        await upload({ file })
      }
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传图片失败')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('确定删除这张图片吗？这个操作不可撤销。')) return
    setError('')
    try {
      await deleteItem(id)
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除图片失败')
    }
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await createAlbum({ name: albumName, slug: albumSlug || undefined })
      setAlbumName('')
      setAlbumSlug('')
      await mutateAlbums()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新建相册失败')
    }
  }

  async function handleDeleteAlbum(id: number, name: string) {
    if (!confirm(`确定删除相册「${name}」吗？图片会保留在图库里，只会解除归类。`)) return
    setError('')
    try {
      await deleteAlbum(id)
      await Promise.all([mutateAlbums(), mutate()])
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除相册失败')
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="相册管理"
        actions={
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <MaterialSymbol icon="upload" size={16} />
            {uploading ? '上传中…' : '上传图片'}
          </Button>
        }
        meta={
          <>
            <AdminStatusBadge tone="accent">{items.length} 张图片</AdminStatusBadge>
            <AdminStatusBadge tone="neutral">{albums.length} 个相册</AdminStatusBadge>
          </>
        }
      />

      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

      {/* Albums */}
      <AdminPanel title="相册">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Create form */}
          <form onSubmit={handleCreateAlbum}>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="text-xs text-muted-foreground">名称</span>
                <input
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="比如：海边日记"
                  required
                />
              </label>
              <label className="w-40 shrink-0 space-y-1.5">
                <span className="text-xs text-muted-foreground">Slug（可选）</span>
                <input
                  value={albumSlug}
                  onChange={(e) => setAlbumSlug(e.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="beach-diary"
                />
              </label>
              <Button type="submit" loading={creatingAlbum} disabled={!albumName.trim()}>
                <MaterialSymbol icon="create_new_folder" size={16} />
                新建
              </Button>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              新建后可在下方图片卡片里直接归类，Slug 留空则自动生成。
            </p>
          </form>

          {/* Existing albums */}
          <div className="space-y-1.5">
            {albumsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <GalleryImageSkeleton key={i} className="h-10 rounded-lg" />
              ))
            ) : albums.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">还没有相册</p>
            ) : (
              albums.map((album) => (
                <div
                  key={album.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="truncate text-sm text-foreground">{album.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">/{album.slug}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {items.filter((item) => item.album_id === album.id).length} 张
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAlbum(album.id, album.name)}
                      disabled={deletingAlbum}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      title="删除相册"
                    >
                      <MaterialSymbol icon="delete" size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AdminPanel>

      {/* Gallery */}
      <AdminPanel title="图库">
        {/* Upload drop zone */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-background/30 px-6 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-background/40 hover:text-foreground"
        >
          <MaterialSymbol icon="cloud_upload" size={18} className="text-primary" />
          点击上传图片，支持 JPEG / PNG / WebP / AVIF，单张上限 20MB
        </button>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <GalleryImageSkeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon="imagesmode"
            title="还没有图片"
            description="上传图片后会出现在这里，可以逐张归入相册。"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <GalleryItemEditorCard
                key={item.id}
                item={item}
                albums={albums}
                onDelete={handleDeleteItem}
                onSaved={() => void mutate()}
              />
            ))}
          </div>
        )}
      </AdminPanel>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}

function GalleryItemEditorCard({
  item,
  albums,
  onDelete,
  onSaved,
}: {
  item: GalleryDashboardItem
  albums: GalleryDashboardAlbum[]
  onDelete: (id: number) => Promise<void>
  onSaved: () => void
}) {
  const { trigger: saveItem, isMutating: saving } = useUpdateGalleryItem(item.id)
  const [albumId, setAlbumId] = useState(item.album_id ? String(item.album_id) : '')

  const dirty = albumId !== (item.album_id ? String(item.album_id) : '')

  useEffect(() => {
    setAlbumId(item.album_id ? String(item.album_id) : '')
  }, [item.album_id])

  async function handleAlbumChange(value: string) {
    setAlbumId(value)
    try {
      await saveItem({ description: item.description ?? '', albumId: value ? Number(value) : null })
      onSaved()
    } catch {
      // revert on error
      setAlbumId(item.album_id ? String(item.album_id) : '')
    }
  }

  return (
    <article className="group overflow-hidden rounded-lg border border-border/70 bg-background/36">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.thumbnail_url ?? item.url}
          alt={item.title ?? item.file_name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
        <button
          onClick={() => void onDelete(item.id)}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-red-300 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-red-500/40"
          title="删除图片"
        >
          <MaterialSymbol icon="delete" size={14} />
        </button>
        {saving ? (
          <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
            <MaterialSymbol icon="sync" size={12} className="animate-spin text-primary" />
          </div>
        ) : null}
      </div>

      <div className="p-1.5">
        <select
          value={albumId}
          onChange={(e) => void handleAlbumChange(e.target.value)}
          disabled={saving}
          className="h-7 w-full rounded-md border border-border/60 bg-background/50 px-2 text-xs text-foreground transition-colors focus:border-primary/30 focus:outline-none disabled:opacity-50"
        >
          <option value="">未归档</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}
