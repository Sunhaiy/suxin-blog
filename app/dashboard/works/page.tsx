'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import useSWR from 'swr'
import {
  AdminEmptyState,
  AdminField,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminSection,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
  ADMIN_MUTED_PANEL_CLASS,
  ADMIN_TEXTAREA_CLASS,
} from '@/components/admin/AdminPrimitives'
import { AdminDialog } from '@/components/admin/AdminDialog'
import { MediaLibraryPicker } from '@/components/admin/MediaLibraryPicker'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import type { WorkDetail } from '@/types/work'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type WorkForm = WorkDetail

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

function createEmptyWork(): WorkForm {
  return {
    id: 0,
    slug: '',
    title: '',
    subtitle: '',
    summary: '',
    description: '',
    content: '',
    cover_url: '',
    hero_image_url: '',
    seal: '',
    status_text: '',
    progress_text: '',
    version_text: '',
    price: '',
    original_price: '',
    tags: [],
    url: '',
    github_url: '',
    primary_url: '',
    primary_label: '项目官网',
    secondary_url: '',
    secondary_label: 'GitHub',
    year: new Date().getFullYear(),
    sort_order: 0,
    is_published: true,
    contributors: [],
    milestones: [],
    gallery: [],
    created_at: '',
    updated_at: '',
  }
}

export default function DashboardWorksPage() {
  const { data, isLoading, mutate } = useSWR<WorkDetail[]>('/api/works?admin=true', fetcher)
  const [form, setForm] = useState<WorkForm>(createEmptyWork())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!data?.length || selectedId == null) return
    const current = data.find((item) => item.id === selectedId)
    if (current) setForm(current)
  }, [data, selectedId])

  function updateField<Key extends keyof WorkForm>(key: Key, value: WorkForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetNotice() {
    setError('')
    setSuccess('')
  }

  function startNew() {
    setSelectedId(null)
    setForm(createEmptyWork())
    resetNotice()
    setDialogOpen(true)
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    resetNotice()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/cover', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(result, '上传封面失败'))
      }

      updateField('cover_url', result.url)
      setSuccess('作品封面已上传，记得保存项目。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传封面失败')
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    }
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('项目标题不能为空。')
      return
    }

    setSaving(true)
    resetNotice()

    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      subtitle: form.subtitle || null,
      summary: form.summary || null,
      description: form.description || null,
      cover_url: form.cover_url || '',
      tags: form.tags.filter(Boolean),
      url: form.url || null,
      github_url: form.github_url || null,
      primary_url: form.primary_url || form.url || null,
      primary_label: form.primary_label || '项目官网',
      secondary_url: form.secondary_url || form.github_url || null,
      secondary_label: form.secondary_label || 'GitHub',
      year: form.year || null,
      sort_order: form.sort_order || 0,
      is_published: form.is_published,
    }

    try {
      const response = await fetch(form.id ? `/api/works/${form.id}` : '/api/works', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(result, '保存失败'))
      }

      await mutate()
      if (result?.id) {
        setSelectedId(result.id)
        setForm(result)
      }
      setSuccess(form.id ? '项目已更新。' : '项目已创建。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id) return
    if (!confirm(`确定删除「${form.title}」吗？`)) return

    setDeleting(true)
    resetNotice()

    try {
      const response = await fetch(`/api/works/${form.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除失败')
      await mutate()
      setSelectedId(null)
      setForm(createEmptyWork())
      setDialogOpen(false)
      setSuccess('项目已删除。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="项目管理"
        actions={
          <Button onClick={startNew}>
            <MaterialSymbol icon="add" size={18} />
            新建项目
          </Button>
        }
        meta={<AdminStatusBadge tone="accent">{data?.length ?? 0} 个项目</AdminStatusBadge>}
      />

      <AdminPanel title="项目列表">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border/70 bg-background/38" />
            ))}
          </div>
        ) : !data?.length ? (
          <AdminEmptyState
            icon="deployed_code"
            title="还没有项目"
            description="先创建一个项目，前台项目页就会立刻读取到。"
            action={<Button size="sm" onClick={startNew}>新建第一个</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => {
              const primaryUrl = item.primary_url || item.url
              const secondaryUrl = item.github_url || item.secondary_url
              const primaryIsGithub = isGithubUrl(primaryUrl)
              const hasOfficialLink = Boolean(primaryUrl && !primaryIsGithub)
              const hasGithubLink = Boolean(secondaryUrl || primaryIsGithub)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id)
                    setForm(item)
                    resetNotice()
                    setDialogOpen(true)
                  }}
                  className="w-full rounded-xl border border-border/70 bg-background/38 px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-background/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <AdminStatusBadge tone={item.is_published ? 'accent' : 'neutral'}>
                      {item.is_published ? '已发布' : '草稿'}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {item.summary || item.subtitle || '还没有摘要'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <AdminStatusBadge tone={hasOfficialLink ? 'accent' : 'neutral'}>
                      {hasOfficialLink ? '有官网' : '无官网'}
                    </AdminStatusBadge>
                    <AdminStatusBadge tone={hasGithubLink ? 'accent' : 'neutral'}>
                      {hasGithubLink ? '有 GitHub' : '无 GitHub'}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground/60">
                    {item.slug || 'untitled'} · sort {item.sort_order}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </AdminPanel>

      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? '编辑项目' : '新建项目'}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {form.id ? (
                <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
                  <MaterialSymbol icon="delete" size={16} />
                  {deleting ? '删除中…' : '删除项目'}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} loading={saving}>
                <MaterialSymbol icon="save" size={16} />
                {form.id ? '保存修改' : '创建项目'}
              </Button>
            </div>
          </div>
        }
      >
        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
        {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

        <div className="space-y-6">
          <AdminSection title="基础信息">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="标题">
                <input
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="项目名称"
                />
              </AdminField>

              <AdminField label="Slug">
                <input
                  value={form.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="my-project"
                />
              </AdminField>

              <AdminField label="副标题" fullWidth>
                <input
                  value={form.subtitle ?? ''}
                  onChange={(event) => updateField('subtitle', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="一句简短补充"
                />
              </AdminField>

              <AdminField label="翻面简介" fullWidth>
                <textarea
                  value={form.summary ?? ''}
                  onChange={(event) => updateField('summary', event.target.value)}
                  className={ADMIN_TEXTAREA_CLASS}
                  rows={3}
                  placeholder="鼠标悬停翻转卡片后显示的一段简短介绍"
                />
              </AdminField>

              <AdminField label="标签" fullWidth>
                <input
                  value={form.tags.join(', ')}
                  onChange={(event) =>
                    updateField(
                      'tags',
                      event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                    )
                  }
                  className={ADMIN_INPUT_CLASS}
                  placeholder="Next.js, TypeScript, PostgreSQL"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection title="封面与外链">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="封面" fullWidth>
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className={`${ADMIN_MUTED_PANEL_CLASS} overflow-hidden`}>
                    <div className="aspect-[4/3] bg-background/40">
                      {form.cover_url ? (
                        <img src={form.cover_url} alt="作品封面预览" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          暂无封面
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <input
                      value={form.cover_url}
                      onChange={(event) => updateField('cover_url', event.target.value)}
                      className={ADMIN_INPUT_CLASS}
                      placeholder="https://example.com/cover.jpg"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                        loading={uploadingCover}
                      >
                        <MaterialSymbol icon="image_arrow_up" size={16} />
                        {form.cover_url ? '替换' : '上传'}
                      </Button>
                      <MediaLibraryPicker
                        value={form.cover_url}
                        onSelect={(url) => updateField('cover_url', url)}
                        category="artwork"
                        buttonLabel="从相册选"
                        dialogTitle="选择作品封面"
                        description="作品卡片正面的封面可以直接上传，也可以复用相册里的图片。"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!form.cover_url}
                        onClick={() => updateField('cover_url', '')}
                      >
                        <MaterialSymbol icon="delete" size={16} />
                        清空
                      </Button>
                    </div>
                  </div>
                </div>
              </AdminField>

              <AdminField label="年份">
                <input
                  type="number"
                  value={form.year ?? ''}
                  onChange={(event) =>
                    updateField('year', event.target.value ? Number(event.target.value) : null)
                  }
                  className={ADMIN_INPUT_CLASS}
                  placeholder="2026"
                />
              </AdminField>

              <AdminField label="官网链接">
                <input
                  value={form.primary_url ?? form.url ?? ''}
                  onChange={(event) => updateField('primary_url', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://example.com"
                />
              </AdminField>

              <AdminField label="官网按钮文案">
                <input
                  value={form.primary_label ?? ''}
                  onChange={(event) => updateField('primary_label', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="项目官网"
                />
              </AdminField>

              <AdminField label="GitHub 链接">
                <input
                  value={form.github_url ?? form.secondary_url ?? ''}
                  onChange={(event) => {
                    updateField('github_url', event.target.value)
                    if (!form.secondary_url) updateField('secondary_url', event.target.value)
                  }}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://github.com/owner/repo"
                />
              </AdminField>

              <AdminField label="GitHub 按钮文案">
                <input
                  value={form.secondary_label ?? ''}
                  onChange={(event) => updateField('secondary_label', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="GitHub"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection title="发布设置">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="排序">
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => updateField('sort_order', Number(event.target.value) || 0)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="0"
                />
              </AdminField>

              <AdminField label="发布状态">
                <label className="flex h-11 items-center gap-3 rounded-[18px] border border-border/70 bg-background/55 px-4 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => updateField('is_published', event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>{form.is_published ? '前台可见' : '暂不公开'}</span>
                </label>
              </AdminField>
            </div>
          </AdminSection>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </AdminDialog>
    </div>
  )
}

function isGithubUrl(url?: string | null) {
  return (url ?? '').trim().toLowerCase().includes('github.com')
}
