'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ADMIN_INPUT_CLASS,
  ADMIN_SELECT_CLASS,
  ADMIN_TEXTAREA_CLASS,
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/70 bg-background/36 p-3">
                <GalleryImageSkeleton className="aspect-[16/10] rounded-lg" />
                <GalleryImageSkeleton className="mt-3 h-4 w-32 rounded-full" />
                <GalleryImageSkeleton className="mt-2 h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon="imagesmode"
            title="还没有图片"
            description="上传图片后会出现在这里，可以逐张归入相册或添加简介。"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
  const [description, setDescription] = useState(item.description ?? '')
  const [albumId, setAlbumId] = useState(item.album_id ? String(item.album_id) : '')
  const [error, setError] = useState('')

  const dirty =
    description !== (item.description ?? '') || albumId !== (item.album_id ? String(item.album_id) : '')

  useEffect(() => {
    setDescription(item.description ?? '')
    setAlbumId(item.album_id ? String(item.album_id) : '')
  }, [item.album_id, item.description])

  async function handleSave() {
    setError('')
    try {
      await saveItem({ description: description.trim() || '', albumId: albumId ? Number(albumId) : null })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存图片信息失败')
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background/36">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-border/70">
        <img
          src={item.thumbnail_url ?? item.url}
          alt={item.title ?? item.file_name}
          className="h-full w-full object-cover"
        />
        <button
          onClick={() => void onDelete(item.id)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-black/50 text-red-300 backdrop-blur-md transition-colors hover:bg-red-500/20"
          title="删除图片"
        >
          <MaterialSymbol icon="delete" size={15} />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <p className="truncate text-sm text-foreground">{item.title ?? item.file_name}</p>

        <select
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          className={ADMIN_SELECT_CLASS}
        >
          <option value="">未归档</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={ADMIN_TEXTAREA_CLASS}
          placeholder="图片简介（留空则前台不显示）"
        />

        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            loading={saving}
            disabled={!dirty && !saving}
            onClick={() => void handleSave()}
          >
            <MaterialSymbol icon="save" size={15} />
            保存
          </Button>
        </div>
      </div>
    </article>
  )
}
