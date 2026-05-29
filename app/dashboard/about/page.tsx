'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
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
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import type { AboutLifestyleItem, AboutStrengthItem, SiteProfile } from '@/types/site'
import type { WorkDetail } from '@/types/work'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

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

async function saveSiteProfile(profile: SiteProfile) {
  const response = await fetch('/api/settings/site-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '保存关于页配置失败'))
  }

  return response.json() as Promise<SiteProfile>
}

async function uploadVideo(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload/video', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '上传视频失败'))
  }

  return response.json() as Promise<{ url: string }>
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
    throw new Error(readApiError(error, '上传封面失败'))
  }

  return response.json() as Promise<{ url: string }>
}

function createStrength(index: number): AboutStrengthItem {
  return {
    icon: 'star',
    title: `能力 ${index + 1}`,
    lines: ['补充一条能力描述'],
  }
}

function createLifestyleItem(index: number): AboutLifestyleItem {
  return {
    id: `lifestyle-${Date.now()}-${index}`,
    icon: 'star',
    label: '新条目',
    title: '写一句用于展开预览的大标题',
    eyebrow: 'Lifestyle',
    description: '补充这项生活方式背后的说明。',
    mediaType: 'image',
    mediaUrl: '/hero.png',
    posterUrl: null,
  }
}

export default function DashboardAboutPage() {
  const profileRequest = useSWR<SiteProfile>('/api/settings/site-profile', fetcher)
  const worksRequest = useSWR<WorkDetail[]>('/api/works?admin=true', fetcher)

  const [profileForm, setProfileForm] = useState<SiteProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingVideoIndex, setUploadingVideoIndex] = useState<number | null>(null)
  const [uploadingPosterIndex, setUploadingPosterIndex] = useState<number | null>(null)
  const [uploadingPortrait, setUploadingPortrait] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profileRequest.data) setProfileForm(profileRequest.data)
  }, [profileRequest.data])

  function resetNotice() {
    setError('')
    setSuccess('')
  }

  function updateProfile<Key extends keyof SiteProfile>(key: Key, value: SiteProfile[Key]) {
    setProfileForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function updateStrength(index: number, patch: Partial<AboutStrengthItem>) {
    if (!profileForm) return
    const next = profileForm.aboutStrengths.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    updateProfile('aboutStrengths', next)
  }

  function addStrength() {
    if (!profileForm || profileForm.aboutStrengths.length >= 8) return
    updateProfile('aboutStrengths', [
      ...profileForm.aboutStrengths,
      createStrength(profileForm.aboutStrengths.length),
    ])
  }

  function removeStrength(index: number) {
    if (!profileForm || profileForm.aboutStrengths.length <= 1) return
    updateProfile(
      'aboutStrengths',
      profileForm.aboutStrengths.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  function updateFeaturedSlot(slotIndex: number, id: number) {
    if (!profileForm) return
    const slots = Array.from({ length: 4 }, (_, index) => profileForm.aboutFeaturedWorkIds[index] ?? 0)
    slots[slotIndex] = id
    const next = slots.filter((item, index, array) => item > 0 && array.indexOf(item) === index)
    updateProfile('aboutFeaturedWorkIds', next)
  }

  function updateLifestyle(index: number, patch: Partial<AboutLifestyleItem>) {
    if (!profileForm) return
    const next = profileForm.aboutLifestyleItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    updateProfile('aboutLifestyleItems', next)
  }

  function addLifestyle() {
    if (!profileForm || profileForm.aboutLifestyleItems.length >= 8) return
    updateProfile('aboutLifestyleItems', [
      ...profileForm.aboutLifestyleItems,
      createLifestyleItem(profileForm.aboutLifestyleItems.length),
    ])
  }

  function removeLifestyle(index: number) {
    if (!profileForm || profileForm.aboutLifestyleItems.length <= 1) return
    updateProfile(
      'aboutLifestyleItems',
      profileForm.aboutLifestyleItems.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  async function handleVideoUpload(index: number, file: File | null) {
    if (!file) return
    setUploadingVideoIndex(index)
    resetNotice()

    try {
      const result = await uploadVideo(file)
      updateLifestyle(index, { mediaType: 'video', mediaUrl: result.url })
      setSuccess('视频已上传，记得保存配置后前台才会生效。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传视频失败')
    } finally {
      setUploadingVideoIndex(null)
    }
  }

  async function handlePosterUpload(index: number, file: File | null) {
    if (!file) return
    setUploadingPosterIndex(index)
    resetNotice()

    try {
      const result = await uploadImage(file)
      updateLifestyle(index, { posterUrl: result.url })
      setSuccess('视频封面已上传，记得保存配置后前台才会生效。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传封面失败')
    } finally {
      setUploadingPosterIndex(null)
    }
  }

  async function handlePortraitUpload(file: File | null) {
    if (!file) return
    setUploadingPortrait(true)
    resetNotice()

    try {
      const result = await uploadImage(file)
      updateProfile('aboutHeroPortraitUrl', result.url)
      setSuccess('自拍照已上传，记得保存配置后前台才会生效。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传自拍照失败')
    } finally {
      setUploadingPortrait(false)
    }
  }

  async function handleSave() {
    if (!profileForm) return
    setSaving(true)
    resetNotice()

    try {
      const next = await saveSiteProfile(profileForm)
      profileRequest.mutate(next, false)
      setProfileForm(next)
      setSuccess('关于页配置已保存，前台 /about 会读取这份资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存关于页配置失败')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = profileRequest.isLoading || !profileForm
  const works = worksRequest.data ?? []

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="About Studio"
        title="关于页配置"
        description="关于页的文案、能力矩阵、精选项目和生活方式都在这里统一维护，不再散落在前台代码里。"
        meta={
          <>
            <AdminStatusBadge tone="accent">独立页面</AdminStatusBadge>
            <AdminStatusBadge>同步前台 /about</AdminStatusBadge>
          </>
        }
        actions={
          <Button onClick={handleSave} loading={saving} disabled={isLoading}>
            <MaterialSymbol icon="save" size={18} />
            保存配置
          </Button>
        }
      />

      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
      {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

      {isLoading ? (
        <AdminPanel>
          <div className="h-64 animate-pulse rounded-[24px] bg-background/50" />
        </AdminPanel>
      ) : (
        <>
          <AdminPanel
            title="首屏身份"
            description="对应关于页顶部的大标题、英文名、身份行和个人简介。"
            icon="badge"
          >
            <AdminSection title="人物介绍" description="建议保持短句、有力量，像作品集首页一样直接。">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="中文姓名">
                  <input
                    className={ADMIN_INPUT_CLASS}
                    value={profileForm.aboutHeroName}
                    onChange={(event) => updateProfile('aboutHeroName', event.target.value)}
                    placeholder="孙海洋"
                  />
                </AdminField>
                <AdminField label="英文名">
                  <input
                    className={ADMIN_INPUT_CLASS}
                    value={profileForm.aboutHeroNameEn}
                    onChange={(event) => updateProfile('aboutHeroNameEn', event.target.value)}
                    placeholder="Sun Haiyang"
                  />
                </AdminField>
                <AdminField label="身份标签" fullWidth>
                  <input
                    className={ADMIN_INPUT_CLASS}
                    value={profileForm.aboutHeroRoleLine}
                    onChange={(event) => updateProfile('aboutHeroRoleLine', event.target.value)}
                    placeholder="全栈开发者 / Android 开发者 / AI Builder"
                  />
                </AdminField>
                <AdminField
                  label="简介正文"
                  fullWidth
                  hint={`${profileForm.aboutHeroBio.length}/620，前台会自动按段落宽度换行。`}
                >
                  <textarea
                    className={ADMIN_TEXTAREA_CLASS}
                    rows={5}
                    value={profileForm.aboutHeroBio}
                    onChange={(event) => updateProfile('aboutHeroBio', event.target.value)}
                    placeholder="写一段关于自己的介绍"
                  />
                </AdminField>
                <AdminField
                  label="首屏自拍照"
                  fullWidth
                  hint="展示在关于页首屏右侧（移动端在简介下方）。建议竖向或方形人像，JPG / PNG。"
                >
                  <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                    <div className="relative aspect-square w-[120px] overflow-hidden rounded-2xl border border-border/70 bg-background/55">
                      {profileForm.aboutHeroPortraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profileForm.aboutHeroPortraitUrl}
                          alt="自拍照预览"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <MaterialSymbol icon="account_circle" size={40} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={profileForm.aboutHeroPortraitUrl ?? ''}
                        onChange={(event) =>
                          updateProfile('aboutHeroPortraitUrl', event.target.value || null)
                        }
                        placeholder="/uploads/example.jpg"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={uploadingPortrait}
                          onClick={() =>
                            document.getElementById('about-portrait-upload')?.click()
                          }
                        >
                          <MaterialSymbol icon="image_arrow_up" size={16} />
                          上传自拍照
                        </Button>
                        {profileForm.aboutHeroPortraitUrl ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => updateProfile('aboutHeroPortraitUrl', null)}
                          >
                            移除
                          </Button>
                        ) : null}
                      </div>
                      <input
                        id="about-portrait-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          void handlePortraitUpload(event.target.files?.[0] ?? null)
                          event.target.value = ''
                        }}
                      />
                    </div>
                  </div>
                </AdminField>
              </div>
            </AdminSection>
          </AdminPanel>

          <AdminPanel
            title="名牌横幅"
            description="关于页顶部与核心能力之间的高保真名牌，文案和 Logo 均可配置。"
            icon="workspace_premium"
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <AdminSection title="Logo 与文案" description="Logo 是纯文字拼出的标记，适合放短英文或品牌缩写。">
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminField label="Logo 上半">
                    <input
                      className={ADMIN_INPUT_CLASS}
                      value={profileForm.aboutNameplateLogoTop}
                      onChange={(event) => updateProfile('aboutNameplateLogoTop', event.target.value)}
                      placeholder="SU"
                    />
                  </AdminField>
                  <AdminField label="Logo 下半">
                    <input
                      className={ADMIN_INPUT_CLASS}
                      value={profileForm.aboutNameplateLogoBottom}
                      onChange={(event) => updateProfile('aboutNameplateLogoBottom', event.target.value)}
                      placeholder="XIN"
                    />
                  </AdminField>
                  <AdminField label="主标题" fullWidth>
                    <input
                      className={ADMIN_INPUT_CLASS}
                      value={profileForm.aboutNameplateTitle}
                      onChange={(event) => updateProfile('aboutNameplateTitle', event.target.value)}
                      placeholder="Suxin Design Studio / 素心设计"
                    />
                  </AdminField>
                  <AdminField label="副标题" fullWidth>
                    <input
                      className={ADMIN_INPUT_CLASS}
                      value={profileForm.aboutNameplateSubtitle}
                      onChange={(event) =>
                        updateProfile('aboutNameplateSubtitle', event.target.value)
                      }
                      placeholder="我们的真本事！请您往下见真章！"
                    />
                  </AdminField>
                  <AdminField label="英文说明" fullWidth>
                    <input
                      className={ADMIN_INPUT_CLASS}
                      value={profileForm.aboutNameplateEnglish}
                      onChange={(event) => updateProfile('aboutNameplateEnglish', event.target.value)}
                      placeholder="Suxin Design Studio What We Do! Please Read The Chapter Below!"
                    />
                  </AdminField>
                </div>
              </AdminSection>

              <section className={`${ADMIN_MUTED_PANEL_CLASS} overflow-hidden p-4`}>
                <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
                  Live Preview
                </p>
                <div className="relative min-h-[260px] overflow-hidden border border-white/[0.12] bg-[#060606]">
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 50% -12%, rgba(255,255,255,0.72), rgba(255,255,255,0.18) 24%, rgba(255,255,255,0.06) 42%, transparent 68%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 52%, rgba(255,255,255,0.08))',
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.14]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                      backgroundSize: '48px 48px',
                    }}
                  />
                  <div className="relative z-10 flex min-h-[260px] flex-col items-center justify-center px-5 text-center text-white">
                    <div className="relative mb-5 h-14 w-20">
                      <span className="absolute left-2 top-2 -rotate-6 text-xl font-black italic leading-none tracking-[-0.12em]">
                        {profileForm.aboutNameplateLogoTop || 'SU'}
                      </span>
                      <span className="absolute left-7 top-7 -rotate-6 text-xl font-black italic leading-none tracking-[-0.12em]">
                        {profileForm.aboutNameplateLogoBottom || 'XIN'}
                      </span>
                      <span className="absolute bottom-1 left-0 h-4 w-14 -rotate-6 rounded-[50%] border-b-[5px] border-l-[3px] border-white" />
                    </div>
                    <h3 className="text-2xl font-black leading-tight tracking-[-0.06em]">
                      {profileForm.aboutNameplateTitle || 'Suxin Design Studio / 素心设计'}
                      {profileForm.aboutNameplateSubtitle ? (
                        <>
                          <br />
                          {profileForm.aboutNameplateSubtitle}
                        </>
                      ) : null}
                    </h3>
                    <p className="mt-4 text-sm font-black tracking-[-0.04em] text-white/28">
                      {profileForm.aboutNameplateEnglish}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </AdminPanel>

          <AdminPanel
            title="核心能力"
            description="这里直接控制关于页的能力矩阵，图标使用 Material Symbols 名称。"
            icon="view_column"
            actions={
              <Button size="sm" variant="secondary" onClick={addStrength}>
                <MaterialSymbol icon="add" size={16} />
                新增能力
              </Button>
            }
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {profileForm.aboutStrengths.map((item, index) => (
                <section key={`${item.title}-${index}`} className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-primary">
                        <MaterialSymbol icon={item.icon || 'star'} size={20} />
                      </span>
                      <p className="text-sm font-semibold text-foreground">能力 {index + 1}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStrength(index)}
                      disabled={profileForm.aboutStrengths.length <= 1}
                    >
                      删除
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="图标">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.icon}
                        onChange={(event) => updateStrength(index, { icon: event.target.value })}
                        placeholder="language"
                      />
                    </AdminField>
                    <AdminField label="标题">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.title}
                        onChange={(event) => updateStrength(index, { title: event.target.value })}
                        placeholder="前端开发"
                      />
                    </AdminField>
                    <AdminField label="描述，每行一条" fullWidth>
                      <textarea
                        className={ADMIN_TEXTAREA_CLASS}
                        rows={4}
                        value={item.lines.join('\n')}
                        onChange={(event) =>
                          updateStrength(index, {
                            lines: event.target.value.split('\n').slice(0, 4),
                          })
                        }
                        placeholder={'Vue / React\nTypeScript'}
                      />
                    </AdminField>
                  </div>
                </section>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            title="精选项目"
            description="手动指定关于页展示的四个作品。未选满时，前台会自动用作品列表继续补齐。"
            icon="deployed_code"
          >
            <AdminSection
              title="四个展示位"
              description="下拉框按顺序对应前台 01-04。作品本身仍在“作品”管理里维护。"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => {
                  const value = profileForm.aboutFeaturedWorkIds[index] ?? 0
                  return (
                    <AdminField key={index} label={`项目 ${index + 1}`}>
                      <select
                        className={ADMIN_INPUT_CLASS}
                        value={value}
                        onChange={(event) => updateFeaturedSlot(index, Number(event.target.value))}
                      >
                        <option value={0}>自动补位</option>
                        {works.map((work) => (
                          <option
                            key={work.id}
                            value={work.id}
                            disabled={
                              work.id !== value && profileForm.aboutFeaturedWorkIds.includes(work.id)
                            }
                          >
                            {work.title}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                  )
                })}
              </div>
              {worksRequest.isLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">正在读取作品列表...</p>
              ) : !works.length ? (
                <AdminNotice tone="warning">还没有可选择的作品，先到“作品”页面创建项目。</AdminNotice>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {profileForm.aboutFeaturedWorkIds.map((id, index) => {
                    const work = works.find((item) => item.id === id)
                    if (!work) return null
                    return (
                      <div key={id} className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                        <p className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{work.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {work.summary || work.subtitle || work.description || work.slug}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </AdminSection>
          </AdminPanel>

          <AdminPanel
            title="生活方式"
            description="这里控制生活方式 Tab、默认视频/图片、展开说明。第一项就是默认展示项。"
            icon="interests"
            actions={
              <Button size="sm" variant="secondary" onClick={addLifestyle}>
                <MaterialSymbol icon="add" size={16} />
                新增条目
              </Button>
            }
          >
            <div className="space-y-4">
              {profileForm.aboutLifestyleItems.map((item, index) => (
                <section key={item.id} className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-primary">
                        <MaterialSymbol icon={item.icon || 'star'} size={20} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {index === 0 ? '默认展示' : `生活方式 ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.label || '未命名条目'}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLifestyle(index)}
                      disabled={profileForm.aboutLifestyleItems.length <= 1}
                    >
                      删除
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="唯一标识">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.id}
                        onChange={(event) => updateLifestyle(index, { id: event.target.value })}
                        placeholder="guitar"
                      />
                    </AdminField>
                    <AdminField label="图标">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.icon}
                        onChange={(event) => updateLifestyle(index, { icon: event.target.value })}
                        placeholder="music_note"
                      />
                    </AdminField>
                    <AdminField label="标签名称">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.label}
                        onChange={(event) => updateLifestyle(index, { label: event.target.value })}
                        placeholder="弹吉他"
                      />
                    </AdminField>
                    <AdminField label="眉标">
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.eyebrow}
                        onChange={(event) => updateLifestyle(index, { eyebrow: event.target.value })}
                        placeholder="Default video"
                      />
                    </AdminField>
                    <AdminField label="大标题" fullWidth>
                      <input
                        className={ADMIN_INPUT_CLASS}
                        value={item.title}
                        onChange={(event) => updateLifestyle(index, { title: event.target.value })}
                        placeholder="把旋律变成另一种写代码的节奏"
                      />
                    </AdminField>
                    <AdminField label="说明" fullWidth>
                      <textarea
                        className={ADMIN_TEXTAREA_CLASS}
                        rows={3}
                        value={item.description}
                        onChange={(event) =>
                          updateLifestyle(index, { description: event.target.value })
                        }
                        placeholder="写一段展开预览时的说明"
                      />
                    </AdminField>
                    <AdminField label="媒体类型">
                      <select
                        className={ADMIN_INPUT_CLASS}
                        value={item.mediaType}
                        onChange={(event) =>
                          updateLifestyle(index, {
                            mediaType: event.target.value === 'video' ? 'video' : 'image',
                          })
                        }
                      >
                        <option value="image">图片</option>
                        <option value="video">视频</option>
                      </select>
                    </AdminField>
                    <AdminField label="媒体地址">
                      <div className="flex flex-col gap-2">
                        <input
                          className={ADMIN_INPUT_CLASS}
                          value={item.mediaUrl}
                          onChange={(event) => updateLifestyle(index, { mediaUrl: event.target.value })}
                          placeholder="/uploads/example.jpg"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={uploadingVideoIndex === index}
                            onClick={() =>
                              document.getElementById(`about-video-upload-${index}`)?.click()
                            }
                          >
                            <MaterialSymbol icon="movie" size={16} />
                            上传视频
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            支持 mp4 / webm / mov，最大 200MB
                          </span>
                        </div>
                        <input
                          id={`about-video-upload-${index}`}
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          className="hidden"
                          onChange={(event) => {
                            void handleVideoUpload(index, event.target.files?.[0] ?? null)
                            event.target.value = ''
                          }}
                        />
                      </div>
                    </AdminField>
                    <AdminField label="视频封面" hint="只有视频需要；图片条目可以留空。" fullWidth>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <input
                          className={ADMIN_INPUT_CLASS}
                          value={item.posterUrl ?? ''}
                          onChange={(event) =>
                            updateLifestyle(index, { posterUrl: event.target.value || null })
                          }
                          placeholder="/uploads/poster.jpg"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={uploadingPosterIndex === index}
                          onClick={() =>
                            document.getElementById(`about-poster-upload-${index}`)?.click()
                          }
                        >
                          <MaterialSymbol icon="image_arrow_up" size={16} />
                          上传封面
                        </Button>
                        <input
                          id={`about-poster-upload-${index}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handlePosterUpload(index, event.target.files?.[0] ?? null)
                            event.target.value = ''
                          }}
                        />
                      </div>
                    </AdminField>
                  </div>
                </section>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            title="收尾与联系"
            description="对应关于页底部的宣言、说明文字和页脚联系邮箱。"
            icon="alternate_email"
          >
            <AdminSection title="结束语" description="标题支持换行，适合保留一点作品集的宣言感。">
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="结尾标题" fullWidth>
                  <textarea
                    className={ADMIN_TEXTAREA_CLASS}
                    rows={3}
                    value={profileForm.aboutClosingTitle}
                    onChange={(event) => updateProfile('aboutClosingTitle', event.target.value)}
                    placeholder="从创意、设计、编码到部署上线，所有项目均由我独立完成。"
                  />
                </AdminField>
                <AdminField label="结尾说明" fullWidth>
                  <textarea
                    className={ADMIN_TEXTAREA_CLASS}
                    rows={3}
                    value={profileForm.aboutClosingDescription}
                    onChange={(event) => updateProfile('aboutClosingDescription', event.target.value)}
                    placeholder="期待用技术与创造力，与世界一起去冒险、去创造。"
                  />
                </AdminField>
                <AdminField label="关于页邮箱" hint="只影响关于页底部展示，不会覆盖全站邮箱。">
                  <input
                    className={ADMIN_INPUT_CLASS}
                    value={profileForm.aboutContactEmail}
                    onChange={(event) => updateProfile('aboutContactEmail', event.target.value)}
                    placeholder="s744129991@outlook.com"
                  />
                </AdminField>
              </div>
            </AdminSection>
          </AdminPanel>
        </>
      )}
    </div>
  )
}
