'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  AdminEmptyState,
  AdminField,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
  ADMIN_MUTED_PANEL_CLASS,
  ADMIN_TEXTAREA_CLASS,
} from '@/components/admin/AdminPrimitives'
import { AdminDialog } from '@/components/admin/AdminDialog'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import type { AnimeStatus, AnimeType, GamePlatform, GameStatus } from '@/types/acg'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type AnimeRecord = {
  id: number
  title: string
  title_cn: string | null
  cover_url: string | null
  type: AnimeType
  episodes_total: number | null
  episodes_watched: number
  status: AnimeStatus
  rating: number | null
  short_review: string | null
  start_season: string | null
  mal_id: number | null
}

type GameRecord = {
  id: number
  title: string
  cover_url: string | null
  cartridge_image_url: string | null
  platform: GamePlatform
  status: GameStatus
  play_hours: number | null
  rating: number | null
  short_review: string | null
  completed_at: string | null
}

type AnimeFormState = {
  id: number | null
  title: string
  titleCn: string
  coverUrl: string
  type: AnimeType
  episodesTotal: string
  episodesWatched: string
  status: AnimeStatus
  rating: string
  shortReview: string
  startSeason: string
  malId: string
}

type GameFormState = {
  id: number | null
  title: string
  coverUrl: string
  cartridgeImageUrl: string
  platform: GamePlatform
  status: GameStatus
  playHours: string
  rating: string
  shortReview: string
  completedAt: string
}

const EMPTY_ANIME: AnimeFormState = {
  id: null,
  title: '',
  titleCn: '',
  coverUrl: '',
  type: 'tv',
  episodesTotal: '',
  episodesWatched: '0',
  status: 'plan_to_watch',
  rating: '',
  shortReview: '',
  startSeason: '',
  malId: '',
}

const EMPTY_GAME: GameFormState = {
  id: null,
  title: '',
  coverUrl: '',
  cartridgeImageUrl: '',
  platform: 'pc',
  status: 'plan_to_play',
  playHours: '',
  rating: '',
  shortReview: '',
  completedAt: '',
}

const ANIME_STATUS_LABELS: Record<AnimeStatus, string> = {
  watching: '在看',
  completed: '看完',
  on_hold: '搁置',
  dropped: '弃坑',
  plan_to_watch: '想看',
}

const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  playing: '游玩中',
  completed: '已通关',
  abandoned: '弃坑',
  plan_to_play: '计划',
  platinum: '白金',
}

const PLATFORM_LABELS: Record<GamePlatform, string> = {
  pc: 'PC',
  ps5: 'PS5',
  ps4: 'PS4',
  switch: 'Switch',
  xbox: 'Xbox',
  mobile: 'Mobile',
  other: 'Other',
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const source = payload as {
    error?: string | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
  }

  if (typeof source.error === 'string' && source.error.trim()) return source.error

  if (source.error && typeof source.error === 'object') {
    const formError = source.error.formErrors?.find(Boolean)
    if (formError) return formError

    const fieldError = Object.values(source.error.fieldErrors ?? {})
      .flat()
      .find(Boolean)
    if (fieldError) return fieldError
  }

  return fallback
}

function toAnimeForm(anime?: AnimeRecord | null): AnimeFormState {
  if (!anime) return EMPTY_ANIME

  return {
    id: anime.id,
    title: anime.title,
    titleCn: anime.title_cn ?? '',
    coverUrl: anime.cover_url ?? '',
    type: anime.type,
    episodesTotal: anime.episodes_total == null ? '' : String(anime.episodes_total),
    episodesWatched: String(anime.episodes_watched),
    status: anime.status,
    rating: anime.rating == null ? '' : String(anime.rating),
    shortReview: anime.short_review ?? '',
    startSeason: anime.start_season ?? '',
    malId: anime.mal_id == null ? '' : String(anime.mal_id),
  }
}

function toGameForm(game?: GameRecord | null): GameFormState {
  if (!game) return EMPTY_GAME

  return {
    id: game.id,
    title: game.title,
    coverUrl: game.cover_url ?? '',
    cartridgeImageUrl: game.cartridge_image_url ?? '',
    platform: game.platform,
    status: game.status,
    playHours: game.play_hours == null ? '' : String(game.play_hours),
    rating: game.rating == null ? '' : String(game.rating),
    shortReview: game.short_review ?? '',
    completedAt: game.completed_at ? game.completed_at.slice(0, 10) : '',
  }
}

async function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '图片上传失败'))
  }

  return response.json() as Promise<{ url: string }>
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const next = Number.parseInt(trimmed, 10)
  return Number.isFinite(next) ? next : undefined
}

function parseOptionalFloat(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const next = Number.parseFloat(trimmed)
  return Number.isFinite(next) ? next : undefined
}

export default function DashboardAcgPage() {
  const [tab, setTab] = useState<'anime' | 'game'>('anime')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ACG Library"
        title="ACG 管理"
        description="把动漫和游戏收进同一套后台节奏里：更安静的列表、更稳定的图像入口、更轻的表单负担。"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/dashboard/works">
              <MaterialSymbol icon="deployed_code" size={18} />
              打开作品管理
            </Link>
          </Button>
        }
        meta={
          <>
            <AdminStatusBadge tone="accent">高频编辑</AdminStatusBadge>
            <AdminStatusBadge tone="neutral">图片上传</AdminStatusBadge>
          </>
        }
      />

      <AdminPanel
        title="内容类型"
        description="两个内容域共用同一套壳层，切换时不用重新适应操作方式。"
        icon="inventory_2"
        bodyClassName="pt-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          {(['anime', 'game'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                tab === item
                  ? 'border-primary/18 bg-primary/10 text-foreground'
                  : 'border-border/70 bg-background/45 text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {item === 'anime' ? '动漫' : '游戏'}
            </button>
          ))}
        </div>
      </AdminPanel>

      {tab === 'anime' ? <AnimeManager /> : <GameManager />}
    </div>
  )
}

function AnimeManager() {
  const { data, isLoading, mutate } = useSWR<{ data: AnimeRecord[]; total: number }>(
    '/api/acg/anime?pageSize=200',
    fetcher
  )
  const [form, setForm] = useState<AnimeFormState>(EMPTY_ANIME)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!data?.data.length || selectedId == null) return
    const current = data.data.find((item) => item.id === selectedId)
    if (current) setForm(toAnimeForm(current))
  }, [data, selectedId])

  function clearNotice() {
    setError('')
    setSuccess('')
  }

  function startNew() {
    setSelectedId(null)
    setForm(EMPTY_ANIME)
    clearNotice()
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('动漫标题不能为空。')
      return
    }

    setSaving(true)
    clearNotice()

    try {
      const response = await fetch(form.id ? `/api/acg/anime/${form.id}` : '/api/acg/anime', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          titleCn: form.titleCn.trim() || undefined,
          coverUrl: form.coverUrl.trim() || undefined,
          type: form.type,
          episodesTotal: parseOptionalInt(form.episodesTotal),
          episodesWatched: parseOptionalInt(form.episodesWatched) ?? 0,
          status: form.status,
          rating: parseOptionalFloat(form.rating),
          shortReview: form.shortReview.trim() || undefined,
          startSeason: form.startSeason.trim() || undefined,
          malId: parseOptionalInt(form.malId),
        }),
      })

      const payload = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(payload, form.id ? '更新失败' : '创建失败'))
      }

      await mutate()
      if (payload?.id) {
        setSelectedId(payload.id)
        setForm(toAnimeForm(payload))
      }
      setSuccess(form.id ? '动漫记录已更新。' : '动漫记录已创建。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id) return
    if (!confirm('确定删除这条动漫记录吗？')) return

    setDeleting(true)
    clearNotice()

    try {
      const response = await fetch(`/api/acg/anime/${form.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(readApiError(payload, '删除失败'))
      }

      await mutate()
      setSelectedId(null)
      setForm(EMPTY_ANIME)
      setDialogOpen(false)
      setSuccess('动漫记录已删除。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    clearNotice()

    try {
      const result = await uploadImage(file)
      setForm((current) => ({ ...current, coverUrl: result.url }))
      setSuccess('封面已上传，记得保存这条动漫记录。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  return (
    <>
      <AdminPanel
        title="动漫列表"
        actions={
          <Button size="sm" onClick={startNew}>
            <MaterialSymbol icon="add" size={16} />
            新建动漫
          </Button>
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <AdminStatusBadge tone="neutral">{data?.total ?? 0} 条记录</AdminStatusBadge>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border/70 bg-background/38" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <AdminEmptyState
            icon="tv"
            title="还没有动漫记录"
            description="先录入一条作品，后面就能持续维护进度和评分。"
            action={<Button size="sm" onClick={startNew}>新建第一条</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((anime) => (
              <SelectableMediaItem
                key={anime.id}
                imageUrl={anime.cover_url}
                title={anime.title_cn ?? anime.title}
                subtitle={`${ANIME_STATUS_LABELS[anime.status]} · ${anime.type.toUpperCase()}`}
                meta={
                  anime.episodes_total != null
                    ? `${anime.episodes_watched} / ${anime.episodes_total} 话`
                    : `${anime.episodes_watched} 话已记录`
                }
                onClick={() => {
                  setSelectedId(anime.id)
                  setForm(toAnimeForm(anime))
                  clearNotice()
                  setDialogOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? '编辑动漫' : '新建动漫'}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {form.id ? (
                <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
                  <MaterialSymbol icon="delete" size={16} />
                  {deleting ? '删除中…' : '删除记录'}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} loading={saving}>
                <MaterialSymbol icon="save" size={16} />
                {form.id ? '保存修改' : '创建动漫'}
              </Button>
            </div>
          </div>
        }
      >
        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <ImageUploadPanel
            label="Cover"
            imageUrl={form.coverUrl}
            fallback={form.titleCn || form.title || '动漫封面'}
            uploading={uploading}
            onUpload={() => coverInputRef.current?.click()}
            onClear={() => setForm((current) => ({ ...current, coverUrl: '' }))}
            note="前台卡片会直接使用这张图。"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="原始标题">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="作品原名"
              />
            </Field>
            <Field label="中文标题">
              <input
                value={form.titleCn}
                onChange={(event) => setForm((current) => ({ ...current, titleCn: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="前台优先显示的标题"
              />
            </Field>
            <Field label="类型">
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AnimeType }))}
                className={INPUT_CLASS}
              >
                {['tv', 'movie', 'ova', 'special'].map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="状态">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as AnimeStatus }))
                }
                className={INPUT_CLASS}
              >
                {Object.entries(ANIME_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="总集数">
              <input
                type="number"
                value={form.episodesTotal}
                onChange={(event) => setForm((current) => ({ ...current, episodesTotal: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="12"
              />
            </Field>
            <Field label="已看集数">
              <input
                type="number"
                value={form.episodesWatched}
                onChange={(event) => setForm((current) => ({ ...current, episodesWatched: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="7"
              />
            </Field>
            <Field label="评分">
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={form.rating}
                onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="8.6"
              />
            </Field>
            <Field label="季度 / 开始时间">
              <input
                value={form.startSeason}
                onChange={(event) => setForm((current) => ({ ...current, startSeason: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="2025 春 / 2025-04"
              />
            </Field>
            <Field label="MyAnimeList ID">
              <input
                type="number"
                value={form.malId}
                onChange={(event) => setForm((current) => ({ ...current, malId: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="12345"
              />
            </Field>
            <Field label="封面链接" fullWidth>
              <input
                value={form.coverUrl}
                onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="https://example.com/cover.jpg 或 /uploads/images/..."
              />
            </Field>
            <Field label="简评" fullWidth>
              <textarea
                value={form.shortReview}
                onChange={(event) => setForm((current) => ({ ...current, shortReview: event.target.value }))}
                className={TEXTAREA_CLASS}
                rows={4}
                placeholder="写给自己看的短评，前台卡片也会复用。"
              />
            </Field>
          </div>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </AdminDialog>
    </>
  )
}

function GameManager() {
  const { data, isLoading, mutate } = useSWR<{ data: GameRecord[]; total: number }>(
    '/api/acg/game?pageSize=200',
    fetcher
  )
  const [form, setForm] = useState<GameFormState>(EMPTY_GAME)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingField, setUploadingField] = useState<'cover' | 'cartridge' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)
  const cartridgeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!data?.data.length || selectedId == null) return
    const current = data.data.find((item) => item.id === selectedId)
    if (current) setForm(toGameForm(current))
  }, [data, selectedId])

  function clearNotice() {
    setError('')
    setSuccess('')
  }

  function startNew() {
    setSelectedId(null)
    setForm(EMPTY_GAME)
    clearNotice()
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('游戏标题不能为空。')
      return
    }

    setSaving(true)
    clearNotice()

    try {
      const response = await fetch(form.id ? `/api/acg/game/${form.id}` : '/api/acg/game', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          coverUrl: form.coverUrl.trim() || undefined,
          cartridgeImageUrl: form.cartridgeImageUrl.trim() || undefined,
          platform: form.platform,
          status: form.status,
          playHours: parseOptionalFloat(form.playHours),
          rating: parseOptionalFloat(form.rating),
          shortReview: form.shortReview.trim() || undefined,
          completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : undefined,
        }),
      })

      const payload = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(payload, form.id ? '更新失败' : '创建失败'))
      }

      await mutate()
      if (payload?.id) {
        setSelectedId(payload.id)
        setForm(toGameForm(payload))
      }
      setSuccess(form.id ? '游戏记录已更新。' : '游戏记录已创建。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id) return
    if (!confirm('确定删除这条游戏记录吗？')) return

    setDeleting(true)
    clearNotice()

    try {
      const response = await fetch(`/api/acg/game/${form.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(readApiError(payload, '删除失败'))
      }

      await mutate()
      setSelectedId(null)
      setForm(EMPTY_GAME)
      setDialogOpen(false)
      setSuccess('游戏记录已删除。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'cover' | 'cartridge'
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingField(field)
    clearNotice()

    try {
      const result = await uploadImage(file)
      setForm((current) => ({
        ...current,
        coverUrl: field === 'cover' ? result.url : current.coverUrl,
        cartridgeImageUrl: field === 'cartridge' ? result.url : current.cartridgeImageUrl,
      }))
      setSuccess('图片已上传，记得保存这条游戏记录。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploadingField(null)
      if (field === 'cover' && coverInputRef.current) coverInputRef.current.value = ''
      if (field === 'cartridge' && cartridgeInputRef.current) cartridgeInputRef.current.value = ''
    }
  }

  return (
    <>
      <AdminPanel
        title="游戏列表"
        actions={
          <Button size="sm" onClick={startNew}>
            <MaterialSymbol icon="add" size={16} />
            新建游戏
          </Button>
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <AdminStatusBadge tone="neutral">{data?.total ?? 0} 条记录</AdminStatusBadge>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border/70 bg-background/38" />
            ))}
          </div>
        ) : !data?.data.length ? (
          <AdminEmptyState
            icon="stadia_controller"
            title="还没有游戏记录"
            description="先录入一条游戏，后面就能继续维护时长、评分和状态。"
            action={<Button size="sm" onClick={startNew}>新建第一条</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.data.map((game) => (
              <SelectableMediaItem
                key={game.id}
                imageUrl={game.cover_url}
                title={game.title}
                subtitle={`${PLATFORM_LABELS[game.platform]} · ${GAME_STATUS_LABELS[game.status]}`}
                meta={
                  game.play_hours != null
                    ? `${game.play_hours}h · ${game.rating ?? '-'} 分`
                    : `${game.rating ?? '-'} 分`
                }
                onClick={() => {
                  setSelectedId(game.id)
                  setForm(toGameForm(game))
                  clearNotice()
                  setDialogOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? '编辑游戏' : '新建游戏'}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {form.id ? (
                <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
                  <MaterialSymbol icon="delete" size={16} />
                  {deleting ? '删除中…' : '删除记录'}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} loading={saving}>
                <MaterialSymbol icon="save" size={16} />
                {form.id ? '保存修改' : '创建游戏'}
              </Button>
            </div>
          </div>
        }
      >
        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

        <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="space-y-4">
            <ImageUploadPanel
              label="Cover"
              imageUrl={form.coverUrl}
              fallback={form.title || '游戏封面'}
              uploading={uploadingField === 'cover'}
              onUpload={() => coverInputRef.current?.click()}
              onClear={() => setForm((current) => ({ ...current, coverUrl: '' }))}
              note="前台游戏卡片会直接使用这张图。"
            />
            <ImageUploadPanel
              label="Alt Image"
              imageUrl={form.cartridgeImageUrl}
              fallback="副图 / 卡带图"
              uploading={uploadingField === 'cartridge'}
              onUpload={() => cartridgeInputRef.current?.click()}
              onClear={() => setForm((current) => ({ ...current, cartridgeImageUrl: '' }))}
              note="卡带图或包装图，可选。"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="游戏名称" fullWidth>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="例如：Hollow Knight"
              />
            </Field>
            <Field label="平台">
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({ ...current, platform: event.target.value as GamePlatform }))
                }
                className={INPUT_CLASS}
              >
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="状态">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as GameStatus }))
                }
                className={INPUT_CLASS}
              >
                {Object.entries(GAME_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="游玩时长">
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.playHours}
                onChange={(event) => setForm((current) => ({ ...current, playHours: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="42.5"
              />
            </Field>
            <Field label="评分">
              <input
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={form.rating}
                onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="9.2"
              />
            </Field>
            <Field label="完成日期">
              <input
                type="date"
                value={form.completedAt}
                onChange={(event) => setForm((current) => ({ ...current, completedAt: event.target.value }))}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="封面链接" fullWidth>
              <input
                value={form.coverUrl}
                onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value }))}
                className={INPUT_CLASS}
                placeholder="https://example.com/cover.jpg 或 /uploads/images/..."
              />
            </Field>
            <Field label="副图链接" fullWidth>
              <input
                value={form.cartridgeImageUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cartridgeImageUrl: event.target.value }))
                }
                className={INPUT_CLASS}
                placeholder="https://example.com/alt.jpg 或 /uploads/images/..."
              />
            </Field>
            <Field label="简评" fullWidth>
              <textarea
                value={form.shortReview}
                onChange={(event) => setForm((current) => ({ ...current, shortReview: event.target.value }))}
                className={TEXTAREA_CLASS}
                rows={4}
                placeholder="写给自己看的短评，前台列表会复用。"
              />
            </Field>
          </div>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleImageUpload(event, 'cover')}
        />
        <input
          ref={cartridgeInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleImageUpload(event, 'cartridge')}
        />
      </AdminDialog>
    </>
  )
}

function SelectableMediaItem({
  imageUrl,
  title,
  subtitle,
  meta,
  onClick,
}: {
  imageUrl: string | null
  title: string
  subtitle: string
  meta: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border/70 bg-background/38 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-background/50"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background/42">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[10px] leading-4 text-muted-foreground">{title}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">{meta}</p>
        </div>
      </div>
    </button>
  )
}

function ImageUploadPanel({
  label,
  imageUrl,
  fallback,
  uploading,
  onUpload,
  onClear,
  note,
}: {
  label: string
  imageUrl: string
  fallback: string
  uploading: boolean
  onUpload: () => void
  onClear: () => void
  note: string
}) {
  return (
    <div className={`${ADMIN_MUTED_PANEL_CLASS} p-5`}>
      <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="group mt-4 block w-full rounded-[24px] border border-dashed border-border/70 bg-background/34 p-4 text-left transition-colors hover:border-primary/24 hover:bg-background/48"
      >
        <div className="flex justify-center">
          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[22px] border border-border/70 bg-background/45">
            {imageUrl ? (
              <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
            ) : (
              <span className="px-4 text-center text-sm text-muted-foreground">{fallback}</span>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-foreground">
          {uploading ? '上传中...' : '点击上传图片'}
        </p>
        <p className="mt-2 text-center text-xs leading-6 text-muted-foreground">{note}</p>
      </button>

      <div className="mt-4 space-y-2">
        <Button variant="secondary" fullWidth onClick={onUpload} disabled={uploading}>
          <MaterialSymbol icon="image_arrow_up" size={18} />
          {uploading ? '上传中' : '更换图片'}
        </Button>
        <Button variant="ghost" fullWidth onClick={onClear} disabled={!imageUrl}>
          <MaterialSymbol icon="delete" size={18} />
          清空图片
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
  fullWidth = false,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <AdminField label={label} hint={hint} fullWidth={fullWidth}>
      {children}
    </AdminField>
  )
}

const INPUT_CLASS = ADMIN_INPUT_CLASS
const TEXTAREA_CLASS = ADMIN_TEXTAREA_CLASS
