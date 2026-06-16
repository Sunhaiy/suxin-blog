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
import type {
  LinkCategory,
  LinkCategoryRow,
  LinkRow,
  LinkSubmissionRow,
  LinkSubmissionStatus,
} from '@/types/link'
import type { SiteProfile } from '@/types/site'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type LinkFormState = {
  id: number | null
  name: string
  url: string
  description: string
  avatarUrl: string
  category: LinkCategory
  sortOrder: number
  isActive: boolean
}

type LinksWorkspaceTab = 'links' | 'profile' | 'submissions'

const EMPTY_FORM: LinkFormState = {
  id: null,
  name: '',
  url: '',
  description: '',
  avatarUrl: '',
  category: 'friend',
  sortOrder: 0,
  isActive: true,
}

const DEFAULT_LINK_CATEGORIES: LinkCategoryRow[] = [
  {
    slug: 'friend',
    label: '友情链接',
    description: null,
    icon: 'group',
    sort_order: 0,
    is_default: true,
    link_count: 0,
    created_at: new Date(),
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  friend: '友情链接',
  tool: '常用工具',
  resource: '学习资源',
  inspire: '灵感来源',
  other: '其他',
}

const SUBMISSION_STATUS_LABELS: Record<LinkSubmissionStatus, string> = {
  pending: '待处理',
  approved: '已采纳',
  rejected: '已忽略',
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

function toFormState(link?: LinkRow | null): LinkFormState {
  if (!link) return EMPTY_FORM

  return {
    id: link.id,
    name: link.name,
    url: link.url,
    description: link.description ?? '',
    avatarUrl: link.avatar_url ?? '',
    category: link.category,
    sortOrder: link.sort_order,
    isActive: link.is_active,
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

async function saveSiteProfile(profile: SiteProfile) {
  const response = await fetch('/api/settings/site-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '保存友链页资料失败'))
  }

  return response.json() as Promise<SiteProfile>
}

function normalizeLinkUrl(url?: string | null) {
  return (url ?? '').trim().replace(/\/+$/, '').toLowerCase()
}

function getDashboardOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}

function toAbsoluteAssetUrl(url?: string | null, siteUrl?: string | null) {
  const value = (url ?? '').trim()
  if (!value) return ''

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }

  const base = (siteUrl || getDashboardOrigin()).replace(/\/+$/, '')
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value.replace(/^\/+/, '')}`
}

function normalizeSiteAssetUrl(url?: string | null, siteUrl?: string | null) {
  const value = (url ?? '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value

  try {
    const target = new URL(value)
    const base = new URL((siteUrl || getDashboardOrigin()).trim())
    if (target.host === base.host && target.pathname.startsWith('/uploads/')) {
      return `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    return value
  }

  return value
}

function getCategoryLabel(slug: string, categories: LinkCategoryRow[]) {
  return categories.find((category) => category.slug === slug)?.label ?? CATEGORY_LABELS[slug] ?? slug
}

function formatDate(value?: Date | string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function toneForSubmissionStatus(status: LinkSubmissionStatus) {
  if (status === 'approved') return 'success' as const
  if (status === 'rejected') return 'danger' as const
  return 'warning' as const
}

export default function DashboardLinksPage() {
  const linksRequest = useSWR<LinkRow[]>('/api/links?admin=true', fetcher)
  const categoriesRequest = useSWR<LinkCategoryRow[]>('/api/link-categories', fetcher)
  const profileRequest = useSWR<SiteProfile>('/api/settings/site-profile', fetcher)
  const submissionsRequest = useSWR<LinkSubmissionRow[]>('/api/link-submissions', fetcher)

  const [form, setForm] = useState<LinkFormState>(EMPTY_FORM)
  const [profileForm, setProfileForm] = useState<SiteProfile | null>(null)
  const [activeTab, setActiveTab] = useState<LinksWorkspaceTab>('links')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [linkStatusFilter, setLinkStatusFilter] = useState<'all' | 'active' | 'hidden'>('all')
  const [submissionStatusFilter, setSubmissionStatusFilter] =
    useState<'all' | LinkSubmissionStatus>('pending')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryDeletingSlug, setCategoryDeletingSlug] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingProfileAvatar, setUploadingProfileAvatar] = useState(false)
  const [submissionSavingId, setSubmissionSavingId] = useState<number | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const profileAvatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!linksRequest.data?.length || selectedId == null) return
    const current = linksRequest.data.find((item) => item.id === selectedId)
    if (current) setForm(toFormState(current))
  }, [linksRequest.data, selectedId])

  useEffect(() => {
    if (profileRequest.data) {
      setProfileForm(profileRequest.data)
    }
  }, [profileRequest.data])

  useEffect(() => {
    const submissions = submissionsRequest.data
    if (!submissions) return
    setSubmissionNotes((current) => {
      const next = { ...current }
      for (const item of submissions) {
        if (next[item.id] === undefined) {
          next[item.id] = item.admin_note ?? ''
        }
      }
      return next
    })
  }, [submissionsRequest.data])

  function clearNotice() {
    setError('')
    setSuccess('')
  }

  function updateProfile<Key extends keyof SiteProfile>(key: Key, value: SiteProfile[Key]) {
    setProfileForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function startNew() {
    setSelectedId(null)
    setForm(EMPTY_FORM)
    setActiveTab('links')
    clearNotice()
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) {
      setError('站点名称和链接是必填项。')
      return
    }

    setSaving(true)
    clearNotice()

    try {
      const response = await fetch(form.id ? `/api/links/${form.id}` : '/api/links', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          description: form.description.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
          category: form.category,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      })

      const payload = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(payload, form.id ? '更新失败' : '创建失败'))
      }

      await Promise.all([linksRequest.mutate(), categoriesRequest.mutate()])

      if (payload?.id) {
        setSelectedId(payload.id)
        setForm(toFormState(payload))
      } else {
        startNew()
      }

      setSuccess(form.id ? '友链已更新。' : '友链已创建。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除这条友链吗？')) return

    setDeletingId(id)
    clearNotice()

    try {
      const response = await fetch(`/api/links/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(readApiError(payload, '删除失败'))
      }

      await Promise.all([linksRequest.mutate(), categoriesRequest.mutate()])
      if (selectedId === id) { setSelectedId(null); setForm(EMPTY_FORM); setDialogOpen(false) }
      setSuccess('友链已删除。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    clearNotice()

    try {
      const result = await uploadImage(file)
      setForm((current) => ({
        ...current,
        avatarUrl: result.url,
      }))
      setSuccess('友链头像已上传，记得保存这条友链。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleProfileAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !profileForm) return

    setUploadingProfileAvatar(true)
    clearNotice()

    try {
      const result = await uploadImage(file)
      updateProfile('avatarUrl', result.url)
      setSuccess('站点头像已上传，记得保存友链页资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '站点头像上传失败')
    } finally {
      setUploadingProfileAvatar(false)
      if (profileAvatarRef.current) profileAvatarRef.current.value = ''
    }
  }

  async function handleSaveProfile() {
    if (!profileForm) return

    setSavingProfile(true)
    clearNotice()

    try {
      const next = await saveSiteProfile({
        ...profileForm,
        avatarUrl: normalizeSiteAssetUrl(profileForm.avatarUrl, profileForm.siteUrl) || null,
      })
      profileRequest.mutate(next, false)
      setProfileForm(next)
      setSuccess('友链页资料已保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存友链页资料失败')
    } finally {
      setSavingProfile(false)
    }
  }

  async function createCategory() {
    const label = categoryDraft.trim()
    if (!label) {
      setError('请输入分组名称。')
      return
    }

    setCategorySaving(true)
    clearNotice()

    try {
      const response = await fetch('/api/link-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readApiError(payload, '创建友链分组失败'))
      }

      await categoriesRequest.mutate()
      setCategoryDraft('')
      setForm((current) => ({ ...current, category: payload.slug ?? current.category }))
      setActiveTab('links')
      setSuccess('友链分组已创建。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建友链分组失败')
    } finally {
      setCategorySaving(false)
    }
  }

  async function deleteCategory(category: LinkCategoryRow) {
    if (category.is_default) {
      setError('默认分组不能删除。')
      return
    }

    if (!confirm(`确定删除「${category.label}」分组吗？该分组下的友链会移回「友情链接」。`)) {
      return
    }

    setCategoryDeletingSlug(category.slug)
    clearNotice()

    try {
      const response = await fetch(`/api/link-categories/${encodeURIComponent(category.slug)}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readApiError(payload, '删除友链分组失败'))
      }

      await Promise.all([categoriesRequest.mutate(), linksRequest.mutate()])
      if (categoryFilter === category.slug) {
        setCategoryFilter('all')
      }
      if (form.category === category.slug) {
        setForm((current) => ({ ...current, category: 'friend' }))
      }
      setSuccess(`分组已删除，${payload?.moved ?? 0} 条友链已移回「友情链接」。`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除友链分组失败')
    } finally {
      setCategoryDeletingSlug(null)
    }
  }

  async function updateSubmissionStatus(
    submission: LinkSubmissionRow,
    status: LinkSubmissionStatus
  ) {
    setSubmissionSavingId(submission.id)
    clearNotice()

    try {
      let adoptedLink: LinkRow | null = null

      if (status === 'approved') {
        const normalizedSubmissionUrl = normalizeLinkUrl(submission.site_url)
        const currentLinks = linksRequest.data ?? (await linksRequest.mutate())
        const existingLink = currentLinks?.find(
          (item) => normalizeLinkUrl(item.url) === normalizedSubmissionUrl
        )
        const linkPayload = {
          name: submission.site_name.trim(),
          url: submission.site_url.trim(),
          description: submission.site_description?.trim() || undefined,
          avatarUrl: submission.site_avatar_url
            ? toAbsoluteAssetUrl(submission.site_avatar_url, profileForm?.siteUrl)
            : undefined,
          category: 'friend' as LinkCategory,
          sortOrder: existingLink?.sort_order ?? 0,
          isActive: true,
        }
        const linkResponse = await fetch(
          existingLink ? `/api/links/${existingLink.id}` : '/api/links',
          {
            method: existingLink ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkPayload),
          }
        )
        const linkResult = await linkResponse.json().catch(() => null)

        if (!linkResponse.ok) {
          throw new Error(
            readApiError(linkResult, existingLink ? '更新友链失败' : '创建友链失败')
          )
        }

        adoptedLink = linkResult as LinkRow
      }

      const response = await fetch(`/api/link-submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: submissionNotes[submission.id] ?? '' }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(payload, '更新申请状态失败'))
      }

      await Promise.all([
        submissionsRequest.mutate(),
        status === 'approved' ? linksRequest.mutate() : undefined,
        status === 'approved' ? categoriesRequest.mutate() : undefined,
      ])

      if (adoptedLink) {
        setSelectedId(adoptedLink.id)
        setForm(toFormState(adoptedLink))
      }

      setSuccess(
        status === 'approved'
          ? '已采纳申请，并写入公开友链。'
          : `申请状态已更新为“${SUBMISSION_STATUS_LABELS[status]}”。`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新申请状态失败')
    } finally {
      setSubmissionSavingId(null)
    }
  }

  async function saveSubmissionNote(id: number) {
    setSubmissionSavingId(id)
    clearNotice()

    try {
      const response = await fetch(`/api/link-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: submissionNotes[id] ?? '' }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readApiError(payload, '保存备注失败'))
      }

      await submissionsRequest.mutate()
      setSuccess('申请备注已保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存备注失败')
    } finally {
      setSubmissionSavingId(null)
    }
  }

  function loadSubmissionIntoForm(submission: LinkSubmissionRow) {
    setForm({
      id: null,
      name: submission.site_name,
      url: submission.site_url,
      description: submission.site_description ?? '',
      avatarUrl: toAbsoluteAssetUrl(submission.site_avatar_url, profileForm?.siteUrl),
      category: 'friend',
      sortOrder: 0,
      isActive: true,
    })
    setSelectedId(null)
    setActiveTab('links')
    setDialogOpen(true)
    setSuccess('已把申请信息带入编辑框，补充后可直接创建友链。')
  }

  const pendingCount =
    submissionsRequest.data?.filter((item) => item.status === 'pending').length ?? 0
  const categoryOptions =
    categoriesRequest.data && categoriesRequest.data.length > 0
      ? categoriesRequest.data
      : DEFAULT_LINK_CATEGORIES
  const links = linksRequest.data ?? []
  const submissions = submissionsRequest.data ?? []
  const filteredLinks = links.filter((link) => {
    const matchCategory = categoryFilter === 'all' || link.category === categoryFilter
    const matchStatus =
      linkStatusFilter === 'all' ||
      (linkStatusFilter === 'active' ? link.is_active : !link.is_active)

    return matchCategory && matchStatus
  })
  const filteredSubmissions = submissions.filter(
    (submission) =>
      submissionStatusFilter === 'all' || submission.status === submissionStatusFilter
  )

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="友情链接"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setActiveTab('profile')}>
              <MaterialSymbol icon="settings" size={16} />
              页面资料
            </Button>
            <Button size="sm" onClick={startNew}>
              <MaterialSymbol icon="add_link" size={16} />
              新建友链
            </Button>
          </div>
        }
        meta={
          <>
            <AdminStatusBadge tone="accent">{linksRequest.data?.length ?? 0} 条</AdminStatusBadge>
            {pendingCount > 0 && (
              <AdminStatusBadge tone="warning">{pendingCount} 条待处理申请</AdminStatusBadge>
            )}
          </>
        }
      />

      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
      {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

      {/* Tab nav */}
      <div className="flex gap-1.5 rounded-xl border border-border/70 bg-background/34 p-1">
        {([
          { key: 'links' as const, label: '友链列表', icon: 'link' },
          { key: 'profile' as const, label: '页面资料', icon: 'badge' },
          { key: 'submissions' as const, label: `申请箱${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: 'inbox' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MaterialSymbol icon={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && profileForm ? (
        <AdminPanel
          title="友链页资料"
          actions={
            <Button size="sm" onClick={handleSaveProfile} loading={savingProfile}>
              <MaterialSymbol icon="save" size={16} />
              保存资料
            </Button>
          }
        >
          <div className="space-y-6">
            <AdminSection title="本站卡片">
              <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                  <button
                    type="button"
                    onClick={() => profileAvatarRef.current?.click()}
                    className="block w-full"
                  >
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background/50">
                      {profileForm.avatarUrl ? (
                        <img src={profileForm.avatarUrl} alt={profileForm.ownerName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl font-semibold text-foreground">{profileForm.ownerInitial}</span>
                      )}
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {uploadingProfileAvatar ? '上传中…' : '点击上传头像'}
                    </p>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => profileAvatarRef.current?.click()} loading={uploadingProfileAvatar}>
                      <MaterialSymbol icon="image_arrow_up" size={14} />
                      上传
                    </Button>
                    <MediaLibraryPicker value={profileForm.avatarUrl} onSelect={(url) => updateProfile('avatarUrl', normalizeSiteAssetUrl(url, profileForm.siteUrl))} buttonLabel="相册" dialogTitle="选择友链页头像" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="站点名称"><input value={profileForm.siteName} onChange={(e) => updateProfile('siteName', e.target.value)} className={INPUT_CLASS} /></Field>
                  <Field label="英文副标"><input value={profileForm.siteNameEn} onChange={(e) => updateProfile('siteNameEn', e.target.value)} className={INPUT_CLASS} /></Field>
                  <Field label="站点地址"><input value={profileForm.siteUrl} onChange={(e) => updateProfile('siteUrl', e.target.value)} className={INPUT_CLASS} placeholder="https://haiy.space" /></Field>
                  <Field label="RSS 链接"><input value={profileForm.rssUrl} onChange={(e) => updateProfile('rssUrl', e.target.value)} className={INPUT_CLASS} placeholder="/rss.xml" /></Field>
                  <Field label="头像地址" fullWidth>
                    <input value={profileForm.avatarUrl ?? ''} onChange={(e) => updateProfile('avatarUrl', e.target.value || null)} onBlur={(e) => updateProfile('avatarUrl', e.target.value ? normalizeSiteAssetUrl(e.target.value, profileForm.siteUrl) : null)} className={INPUT_CLASS} />
                  </Field>
                  <Field label="友链页简介" fullWidth>
                    <textarea value={profileForm.friendLinkIntro} onChange={(e) => updateProfile('friendLinkIntro', e.target.value)} className={TEXTAREA_CLASS} rows={3} />
                  </Field>
                </div>
              </div>
            </AdminSection>

            <AdminSection title="申请规则">
              <Field label="申请要求" fullWidth>
                <textarea value={profileForm.friendLinkRequirements} onChange={(e) => updateProfile('friendLinkRequirements', e.target.value)} className={TEXTAREA_CLASS} rows={5} placeholder={'1. 站点可稳定访问\n2. 有持续更新内容\n3. 简介尽量简洁'} />
              </Field>
            </AdminSection>
          </div>

          <input ref={profileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleProfileAvatarUpload} />
        </AdminPanel>
      ) : null}

      {/* Links tab */}
      {activeTab === 'links' ? (
        <AdminPanel title="友链列表">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[{ slug: 'all', label: '全部' }, ...categoryOptions].map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setCategoryFilter(cat.slug)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === cat.slug
                    ? 'border-primary/24 bg-primary/12 text-foreground'
                    : 'border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
                {'link_count' in cat && <span className="ml-1 opacity-60">{cat.link_count}</span>}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <input value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)} className={`${INPUT_CLASS} w-36`} placeholder="新分组名" />
              <Button variant="secondary" size="sm" onClick={createCategory} loading={categorySaving}>
                <MaterialSymbol icon="add" size={14} />
                新增分组
              </Button>
            </div>
          </div>

          {categoryOptions.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {categoryOptions.filter((c) => !c.is_default).map((cat) => (
                <span key={cat.slug} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground">
                  {cat.label}
                  <button type="button" onClick={() => deleteCategory(cat)} disabled={categoryDeletingSlug === cat.slug} className="text-red-400 hover:text-red-300 disabled:opacity-50">
                    <MaterialSymbol icon="close" size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {linksRequest.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl border border-border/70 bg-background/38" />
              ))}
            </div>
          ) : !filteredLinks.length ? (
            <AdminEmptyState icon="link" title="还没有友链" description="先录入第一条公开链接。" action={<Button size="sm" onClick={startNew}>新建第一条</Button>} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70">
              {filteredLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-3 border-b border-border/60 bg-background/22 px-4 py-3 last:border-b-0 hover:bg-background/40">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background/50">
                    {link.avatar_url
                      ? <img src={link.avatar_url} alt={link.name} className="h-full w-full object-cover" />
                      : <span className="text-sm font-semibold text-foreground">{link.name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{link.name}</span>
                      <AdminStatusBadge tone={link.is_active ? 'success' : 'warning'}>{link.is_active ? '公开' : '隐藏'}</AdminStatusBadge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  </div>
                  <p className="shrink-0 font-mono text-xs text-muted-foreground/60">{formatDate(link.created_at)}</p>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedId(link.id); setForm(toFormState(link)); clearNotice(); setDialogOpen(true) }}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)} disabled={deletingId === link.id} className="text-red-400 hover:text-red-300">
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      ) : null}

      {activeTab === 'submissions' ? (
      <AdminPanel
        title="友链申请"
        description="前台申请表提交的数据会直接落在这里。可以快速标记状态，也可以一键带入右侧编辑器。"
        icon="inbox"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['all', '全部'],
            ['pending', '待处理'],
            ['approved', '已采纳'],
            ['rejected', '已忽略'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSubmissionStatusFilter(key as typeof submissionStatusFilter)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                submissionStatusFilter === key
                  ? 'border-primary/24 bg-primary/12 text-foreground'
                  : 'border-border/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!filteredSubmissions.length ? (
          <AdminEmptyState
            icon="mark_email_unread"
            title="当前筛选下没有友链申请"
            description="切换上方状态筛选，可以查看已采纳或已忽略的申请。"
          />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border/70">
            {filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="border-b border-border/60 bg-background/24 p-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">{submission.site_name}</p>
                      <AdminStatusBadge tone={toneForSubmissionStatus(submission.status)}>
                        {SUBMISSION_STATUS_LABELS[submission.status]}
                      </AdminStatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{submission.site_url}</p>
                    {submission.site_description ? (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        {submission.site_description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => loadSubmissionIntoForm(submission)}
                    >
                      <MaterialSymbol icon="south_west" size={16} />
                      带入编辑器
                    </Button>
                    <Button
                      size="sm"
                      loading={submissionSavingId === submission.id}
                      onClick={() => updateSubmissionStatus(submission, 'approved')}
                    >
                      <MaterialSymbol icon="check" size={16} />
                      采纳
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={submissionSavingId === submission.id}
                      onClick={() => updateSubmissionStatus(submission, 'rejected')}
                    >
                      <MaterialSymbol icon="close" size={16} />
                      忽略
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
                      Submission
                    </p>
                    <p>邮箱：{submission.contact_email}</p>
                    {submission.site_rss_url ? <p>RSS：{submission.site_rss_url}</p> : null}
                    {submission.site_avatar_url ? <p>头像：{submission.site_avatar_url}</p> : null}
                    {submission.contact_note ? <p>备注：{submission.contact_note}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Field label="后台备注">
                      <textarea
                        value={submissionNotes[submission.id] ?? ''}
                        onChange={(event) =>
                          setSubmissionNotes((current) => ({
                            ...current,
                            [submission.id]: event.target.value,
                          }))
                        }
                        className={TEXTAREA_CLASS}
                        rows={4}
                        placeholder="记录回访情况、是否已互链、后续要跟进的内容。"
                      />
                    </Field>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={submissionSavingId === submission.id}
                        onClick={() => saveSubmissionNote(submission.id)}
                      >
                        <MaterialSymbol icon="save" size={16} />
                        保存备注
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
      ) : null}

      {/* Create / Edit dialog */}
      <AdminDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? `编辑：${form.name || '友链'}` : '新建友链'}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              {form.id ? (
                <Button variant="ghost" onClick={() => handleDelete(form.id!)} disabled={deletingId === form.id}>
                  <MaterialSymbol icon="delete" size={16} />
                  {deletingId === form.id ? '删除中…' : '删除友链'}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} loading={saving}>
                <MaterialSymbol icon="save" size={16} />
                {form.id ? '保存修改' : '创建友链'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-background/38 transition-colors hover:border-primary/30 hover:bg-background/52"
            >
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt={form.name || 'avatar'} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-foreground">
                  {(form.name.trim().charAt(0) || '友').toUpperCase()}
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <Field label="头像链接" fullWidth>
                <input
                  value={form.avatarUrl}
                  onChange={(e) => setForm((c) => ({ ...c, avatarUrl: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="https://example.com/avatar.jpg"
                />
              </Field>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                  <MaterialSymbol icon="image_arrow_up" size={14} />
                  上传头像
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setForm((c) => ({ ...c, avatarUrl: '' }))} disabled={!form.avatarUrl}>
                  清空
                </Button>
              </div>
            </div>
          </div>

          {/* Core fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="站点名称">
              <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className={INPUT_CLASS} placeholder="例如：某某的博客" />
            </Field>
            <Field label="友链分类">
              <select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value as LinkCategory }))} className={INPUT_CLASS}>
                {categoryOptions.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                ))}
              </select>
            </Field>
            <Field label="站点链接" fullWidth>
              <input value={form.url} onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))} className={INPUT_CLASS} placeholder="https://example.com" />
            </Field>
            <Field label="一句话简介" fullWidth>
              <textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className={TEXTAREA_CLASS} rows={3} placeholder="这个站点为什么值得一看。" />
            </Field>
          </div>

          {/* Sort & visibility */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28">
              <Field label="排序值">
                <input type="number" value={form.sortOrder} onChange={(e) => setForm((c) => ({ ...c, sortOrder: Number(e.target.value || 0) }))} className={INPUT_CLASS} />
              </Field>
            </div>
            <label className="flex items-center gap-2.5 pb-1">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} className="h-4 w-4 rounded border-border bg-background" />
              <span className="text-sm text-foreground">公开显示</span>
            </label>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      </AdminDialog>
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
