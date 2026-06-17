'use client'

import type { JSONContent } from '@tiptap/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AdminField,
  AdminStatusBadge,
  ADMIN_INPUT_CLASS,
  ADMIN_MUTED_PANEL_CLASS,
  ADMIN_TEXTAREA_CLASS,
} from '@/components/admin/AdminPrimitives'
import { MediaLibraryPicker } from '@/components/admin/MediaLibraryPicker'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ArticleEditorV2, type ArticleEditorStats } from '@/features/editor/ArticleEditorV2'
import { createPost, updatePost } from '@/features/posts/api'
import {
  EMPTY_ARTICLE_DOC,
  ensureArticleDocV2,
  isArticleDocV2,
  sanitizeArticleDocV2,
} from '@/lib/articles/document'
import type { PostRow, PostStatus } from '@/types/post'

interface PostEditorProps {
  post?: PostRow
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
type SaveTarget = 'draft' | 'published' | 'archived' | 'auto' | null

const DEFAULT_STATS: ArticleEditorStats = {
  characters: 0,
  words: 0,
  readingMinutes: 1,
  headings: [],
  activeBlockLabel: '段落',
}

const POST_STATUS_OPTIONS: Array<{
  value: PostStatus
  label: string
  tone: 'neutral' | 'success' | 'warning'
  description: string
}> = [
  {
    value: 'draft',
    label: '草稿',
    tone: 'neutral',
    description: '只在后台可见，适合慢慢写、慢慢改。',
  },
  {
    value: 'published',
    label: '已发布',
    tone: 'success',
    description: '前台会直接展示，适合已经校对完成的文章。',
  },
  {
    value: 'archived',
    label: '已归档',
    tone: 'warning',
    description: '从前台撤下，但内容会继续保留在后台。',
  },
]

function splitTags(input: string) {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDateTime(value: string | null) {
  if (!value) return '未记录'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (input: number) => String(input).padStart(2, '0')

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T')
}

function getCurrentDateTimeLocalValue() {
  return toDateTimeLocalValue(new Date().toISOString())
}

function hasContent(input: {
  title: string
  excerpt: string
  tags: string
  coverUrl: string
  seoTitle: string
  seoDescription: string
  content: JSONContent
  publishedAt: string
}) {
  if (input.title.trim()) return true
  if (input.excerpt.trim()) return true
  if (input.tags.trim()) return true
  if (input.coverUrl.trim()) return true
  if (input.seoTitle.trim()) return true
  if (input.seoDescription.trim()) return true
  if (input.publishedAt.trim()) return true

  return JSON.stringify(input.content) !== JSON.stringify(EMPTY_ARTICLE_DOC)
}

export function PostEditor({ post }: PostEditorProps) {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)
  const suppressDirtyRef = useRef(true)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slugFallbackRef = useRef(`post-${Date.now()}`)

  const legacyContentDetected = post ? !isArticleDocV2(post.content) : false

  const [postId, setPostId] = useState<number | null>(post?.id ?? null)
  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [tags, setTags] = useState((post?.tags ?? []).join(', '))
  const [category, setCategory] = useState(post?.category ?? '未分类')
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [draftCategoryName, setDraftCategoryName] = useState('')
  const [coverUrl, setCoverUrl] = useState(post?.cover_url ?? '')
  const [coverAlt, setCoverAlt] = useState(post?.cover_alt ?? '')
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? '')
  const [isFeatured, setIsFeatured] = useState(post?.is_featured ?? false)
  const [content, setContent] = useState<JSONContent>(ensureArticleDocV2(post?.content) as JSONContent)
  const [stats, setStats] = useState<ArticleEditorStats>(DEFAULT_STATS)
  const [status, setStatus] = useState<PostStatus>(legacyContentDetected ? 'draft' : (post?.status ?? 'draft'))
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    post?.updated_at ? new Date(post.updated_at).toISOString() : null
  )
  const [publishedAt, setPublishedAt] = useState<string>(
    toDateTimeLocalValue(post?.published_at ? new Date(post.published_at).toISOString() : null) ||
      getCurrentDateTimeLocalValue()
  )
  const [saving, setSaving] = useState(false)
  const [saveTarget, setSaveTarget] = useState<SaveTarget>(null)
  const [saveState, setSaveState] = useState<SaveState>(legacyContentDetected ? 'dirty' : 'idle')
  const [coverUploading, setCoverUploading] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then((response) => response.json())
      .then((data: Array<{ category: string }>) => {
        setExistingCategories(
          Array.from(
            new Set(
              data
                .map((item) => item.category?.trim())
                .filter((item): item is string => Boolean(item))
            )
          )
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'published' && !publishedAt) {
      setPublishedAt(getCurrentDateTimeLocalValue())
    }
  }, [status, publishedAt])

  function autoSlug(input: string) {
    const latin = input
      .toLowerCase()
      .replace(/[\u4e00-\u9fa5]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return latin || slugFallbackRef.current
  }

  function markDirty() {
    if (suppressDirtyRef.current) return
    setSaveState((current) => (current === 'saving' ? current : 'dirty'))
    if (error) setError('')
  }

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      suppressDirtyRef.current = false
      return
    }

    markDirty()
  }, [title, slug, excerpt, tags, category, coverUrl, coverAlt, seoTitle, seoDescription, isFeatured, content, status, publishedAt])

  const resolvedSlug = useMemo(() => slug || autoSlug(title), [slug, title])
  const tagsList = useMemo(() => splitTags(tags), [tags])
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          existingCategories
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ),
    [existingCategories]
  )
  const previewHref = postId && resolvedSlug ? `/posts/${resolvedSlug}?preview=1` : null
  const canAutosave =
    saveState === 'dirty' &&
    !saving &&
    hasContent({ title, excerpt, tags, coverUrl, seoTitle, seoDescription, content, publishedAt })

  function commitNewCategory() {
    const nextCategory = draftCategoryName.trim()

    if (!nextCategory) {
      setDraftCategoryName('')
      setCreatingCategory(false)
      return
    }

    setCategory(nextCategory)
    setExistingCategories((current) => Array.from(new Set([...current, nextCategory])))
    setDraftCategoryName('')
    setCreatingCategory(false)
  }

  function cancelNewCategory() {
    setDraftCategoryName('')
    setCreatingCategory(false)
  }

  async function persist(targetStatus: PostStatus, source: 'manual' | 'auto') {
    if (!title.trim()) {
      setError('标题不能为空。')
      setSaveState('error')
      return
    }

    const nextCategory = category.trim() || '未分类'
    const payload = {
      title,
      slug: resolvedSlug,
      content: sanitizeArticleDocV2(content),
      excerpt: excerpt.trim() || undefined,
      coverUrl: coverUrl.trim() || null,
      coverAlt: coverAlt.trim() || null,
      seoTitle: seoTitle.trim() || title.trim() || null,
      seoDescription: seoDescription.trim() || excerpt.trim() || null,
      isFeatured,
      status: targetStatus,
      tags: tagsList,
      category: nextCategory,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    }

    setSaving(true)
    setSaveTarget(source === 'auto' ? 'auto' : targetStatus)
    setSaveState('saving')
    setError('')

    try {
      const saved = postId ? await updatePost(postId, payload) : await createPost(payload)

      suppressDirtyRef.current = true
      setPostId(saved.id)
      setStatus(saved.status)
      setCategory(saved.category || nextCategory)
      setPublishedAt(
        toDateTimeLocalValue(saved.published_at ? new Date(saved.published_at).toISOString() : null)
      )
      setLastSavedAt(saved.updated_at ? new Date(saved.updated_at).toISOString() : new Date().toISOString())
      setSaveState('saved')

      if (!categoryOptions.includes(nextCategory)) {
        setExistingCategories((current) => Array.from(new Set([...current, nextCategory])))
      }

      if (!postId) {
        router.replace(`/dashboard/editor/${saved.id}`)
      }

      window.setTimeout(() => {
        suppressDirtyRef.current = false
        setSaveState((current) => (current === 'saved' ? 'idle' : current))
      }, 120)

      if (source === 'manual' && targetStatus === 'published') {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败。')
      setSaveState('error')
      suppressDirtyRef.current = false
    } finally {
      setSaving(false)
      setSaveTarget(null)
    }
  }

  useEffect(() => {
    if (!canAutosave) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      void persist(status, 'auto')
    }, 1400)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [canAutosave, title, slug, excerpt, tags, category, coverUrl, coverAlt, seoTitle, seoDescription, isFeatured, content, status, publishedAt])

  async function handleCoverUpload(file: File) {
    setCoverUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/cover', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(typeof payload?.error === 'string' ? payload.error : '封面上传失败')
      }

      const { url } = await response.json()
      setCoverUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '封面上传失败')
    } finally {
      setCoverUploading(false)
    }
  }

  function removeTag(tag: string) {
    setTags(tagsList.filter((item) => item !== tag).join(', '))
  }

  return (
    <div className="-mx-4 -mt-4 flex min-h-full flex-col sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/92 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
        <div className="mx-auto flex h-12 max-w-[1680px] items-center gap-2.5">
          <Link
            href="/dashboard/posts"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <MaterialSymbol icon="arrow_back" size={14} />
            文章
          </Link>

          <EditorStatusBadge saveState={saveState} status={status} />

          {legacyContentDetected ? (
            <AdminStatusBadge tone="warning">旧格式</AdminStatusBadge>
          ) : null}

          {error ? (
            <span className="max-w-[240px] truncate text-xs text-red-400">{error}</span>
          ) : null}

          {/* stats — subtle, mid-bar */}
          <span className="hidden text-xs text-muted-foreground/60 sm:block">
            {stats.words} 字 · {stats.readingMinutes} 分钟 · {stats.activeBlockLabel}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {previewHref ? (
              <a
                href={previewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MaterialSymbol icon="preview" size={14} />
                预览
              </a>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              loading={saving && (saveTarget === 'draft' || saveTarget === 'auto')}
              onClick={() => void persist('draft', 'manual')}
            >
              <MaterialSymbol icon="save" size={15} />
              草稿
            </Button>

            <Button
              size="sm"
              loading={saving && saveTarget === 'published'}
              onClick={() => void persist('published', 'manual')}
            >
              <MaterialSymbol icon="send" size={15} />
              {status === 'published' ? '更新' : '发布'}
            </Button>

            {/* Sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                sidebarOpen
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border/70 bg-background/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <MaterialSymbol icon="view_column" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col xl:flex-row">

        {/* Writing canvas */}
        <section className="min-w-0 flex-1 overflow-x-hidden px-4 pt-10 pb-20 sm:px-8 xl:px-14">
          {/* Title block — no card, flows into editor */}
          <div className="mx-auto w-full max-w-[760px]">
            {isFeatured ? (
              <div className="mb-4">
                <AdminStatusBadge tone="accent">推荐文章</AdminStatusBadge>
              </div>
            ) : null}
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="文章标题"
              className="w-full bg-transparent text-[2.6rem] font-semibold leading-[1.2] tracking-[-0.05em] text-foreground outline-none placeholder:text-foreground/18"
            />
            <div className="mt-3 flex items-center gap-1.5 font-mono text-xs text-muted-foreground/50">
              <MaterialSymbol icon="link" size={12} />
              /posts/{resolvedSlug || 'url-slug'}
            </div>
          </div>

          <div className="mt-8">
            <ArticleEditorV2
              initialContent={content}
              onChange={setContent}
              onStatsChange={setStats}
              placeholder="从这里开始写正文。输入 / 插入提示块、FAQ、时间线、文件树、终端演示和图片卡片。"
            />
          </div>
        </section>

        {/* Inspector sidebar */}
        {sidebarOpen ? (
          <aside className="w-full shrink-0 border-t border-border/70 bg-card/60 backdrop-blur-xl xl:w-[360px] xl:border-l xl:border-t-0">
            <div className="sticky top-12 max-h-[calc(100vh-3rem)] overflow-y-auto">
              <div className="space-y-0 divide-y divide-border/60">

                {/* Structure */}
                <div className="px-5 py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">文档结构</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>当前块</span>
                    <span className="font-mono">{stats.activeBlockLabel}</span>
                  </div>
                  <div className="space-y-1.5">
                    {stats.headings.length > 0 ? (
                      stats.headings.map((heading, index) => (
                        <div
                          key={`${heading.id}-${index}`}
                          className="truncate rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-foreground/80"
                          style={{ marginLeft: `${Math.max(0, heading.level - 1) * 10}px` }}
                        >
                          {heading.text}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">还没有标题，先用 H1-H6 把结构立起来。</p>
                    )}
                  </div>
                </div>

                {/* Basic info */}
                <div className="space-y-4 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">基础信息</p>

                  <AdminField label="URL Slug" hint="为空时根据标题自动生成">
                    <input
                      type="text"
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      placeholder={resolvedSlug || 'url-slug'}
                      className={`${ADMIN_INPUT_CLASS} font-mono text-xs`}
                    />
                  </AdminField>

                  <AdminField label="分类">
                    {creatingCategory ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={draftCategoryName}
                          onChange={(event) => setDraftCategoryName(event.target.value)}
                          placeholder="输入新分类名"
                          className={`${ADMIN_INPUT_CLASS} flex-1`}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') { event.preventDefault(); commitNewCategory() }
                            if (event.key === 'Escape') cancelNewCategory()
                          }}
                        />
                        <Button variant="secondary" size="sm" onClick={commitNewCategory}>完成</Button>
                      </div>
                    ) : (
                      <select
                        value={categoryOptions.includes(category) ? category : '__other__'}
                        onChange={(event) => {
                          if (event.target.value === '__new__') { setDraftCategoryName(''); setCreatingCategory(true); return }
                          if (event.target.value !== '__other__') setCategory(event.target.value)
                        }}
                        className={ADMIN_INPUT_CLASS}
                      >
                        {categoryOptions.map((item, index) => (
                          <option key={`${item}-${index}`} value={item}>{item}</option>
                        ))}
                        {!categoryOptions.includes(category) ? (
                          <option value="__other__">{category || '未分类'}</option>
                        ) : null}
                        <option value="__new__">+ 新建分类</option>
                      </select>
                    )}
                  </AdminField>

                  <AdminField label="标签" hint="逗号分隔">
                    <input
                      type="text"
                      value={tags}
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="LLM, 教程, AI"
                      className={ADMIN_INPUT_CLASS}
                    />
                    {tagsList.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tagsList.map((tag, index) => (
                          <button
                            key={`${tag}-${index}`}
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary"
                          >
                            {tag}
                            <MaterialSymbol icon="close" size={12} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </AdminField>

                  <AdminField label="摘要" hint="建议 120–160 字">
                    <textarea
                      value={excerpt}
                      onChange={(event) => setExcerpt(event.target.value)}
                      placeholder="一句话说清楚这篇文章的核心收益。"
                      rows={4}
                      className={`${ADMIN_TEXTAREA_CLASS} resize-none`}
                    />
                  </AdminField>
                </div>

                {/* Cover */}
                <div className="space-y-4 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">封面</p>

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void handleCoverUpload(file)
                      event.target.value = ''
                    }}
                  />

                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/30">
                    <div className="aspect-[16/9] bg-background/40">
                      {coverUrl ? (
                        <img src={coverUrl} alt="封面预览" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          暂无封面
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-border/60 p-3">
                      <Button variant="secondary" size="sm" disabled={coverUploading} onClick={() => coverInputRef.current?.click()}>
                        <MaterialSymbol icon="image_arrow_up" size={14} />
                        {coverUploading ? '上传中' : coverUrl ? '替换' : '上传'}
                      </Button>
                      <MediaLibraryPicker value={coverUrl} onSelect={setCoverUrl} category="artwork" buttonLabel="相册" dialogTitle="选择封面" />
                      {coverUrl ? (
                        <Button variant="ghost" size="sm" onClick={() => setCoverUrl('')}>
                          <MaterialSymbol icon="delete" size={14} />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <AdminField label="封面 Alt">
                    <input
                      type="text"
                      value={coverAlt}
                      onChange={(event) => setCoverAlt(event.target.value)}
                      placeholder="例：桌面上的机械键盘特写"
                      className={ADMIN_INPUT_CLASS}
                    />
                  </AdminField>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/30 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(event) => setIsFeatured(event.target.checked)}
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    <span className="text-sm text-foreground">推荐文章</span>
                  </label>
                </div>

                {/* Publish */}
                <div className="space-y-4 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">发布状态</p>

                  <div className="flex gap-1.5 rounded-xl border border-border/70 bg-background/30 p-1">
                    {POST_STATUS_OPTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => void persist(item.value, 'manual')}
                        disabled={saving}
                        className={cn(
                          'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                          status === item.value
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {saving && saveTarget === item.value ? '…' : item.label}
                      </button>
                    ))}
                  </div>

                  <AdminField label="发布时间">
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={publishedAt}
                        onChange={(event) => setPublishedAt(event.target.value)}
                        className={`${ADMIN_INPUT_CLASS} flex-1`}
                      />
                      <Button variant="ghost" size="sm" disabled={!publishedAt} onClick={() => setPublishedAt('')}>
                        <MaterialSymbol icon="event_busy" size={14} />
                      </Button>
                    </div>
                  </AdminField>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: '字数', value: String(stats.words) },
                      { label: '阅读', value: `${stats.readingMinutes} 分钟` },
                      { label: '保存', value: formatDateTime(lastSavedAt).replace(/\d{4}\//, '') },
                      { label: '状态', value: POST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '草稿' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                        <p className="text-muted-foreground">{item.label}</p>
                        <p className="mt-1 font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO */}
                <div className="space-y-4 px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">SEO</p>

                  <AdminField label="SEO 标题" hint="为空时回落到文章标题">
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(event) => setSeoTitle(event.target.value)}
                      placeholder={title || '建议 60 字以内'}
                      className={ADMIN_INPUT_CLASS}
                    />
                  </AdminField>

                  <AdminField label="SEO 描述" hint="为空时回落到摘要">
                    <textarea
                      value={seoDescription}
                      onChange={(event) => setSeoDescription(event.target.value)}
                      placeholder={excerpt || '建议 140–160 字'}
                      rows={3}
                      className={`${ADMIN_TEXTAREA_CLASS} resize-none`}
                    />
                  </AdminField>
                </div>

              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function EditorStatusBadge({
  saveState,
  status,
}: {
  saveState: SaveState
  status: PostStatus
}) {
  if (saveState === 'saving') {
    return <AdminStatusBadge tone="accent">保存中</AdminStatusBadge>
  }

  if (saveState === 'dirty') {
    return <AdminStatusBadge tone="warning">未保存</AdminStatusBadge>
  }

  if (saveState === 'saved') {
    return <AdminStatusBadge tone="success">已保存</AdminStatusBadge>
  }

  if (saveState === 'error') {
    return <AdminStatusBadge tone="danger">保存失败</AdminStatusBadge>
  }

  const current = POST_STATUS_OPTIONS.find((item) => item.value === status)
  return <AdminStatusBadge tone={current?.tone ?? 'neutral'}>{current?.label ?? '草稿'}</AdminStatusBadge>
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}
