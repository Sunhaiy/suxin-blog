'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
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
import { MediaLibraryPicker } from '@/components/admin/MediaLibraryPicker'
import { SceneFilterLayer } from '@/components/scene/SceneFilterLayer'
import { Button } from '@/components/ui/Button'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import type { SiteProfile } from '@/types/site'
import type { BackgroundSceneSettings } from '@/types/work'

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

async function saveScene(scene: BackgroundSceneSettings) {
  const response = await fetch('/api/settings/background-scene', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '保存场景设置失败'))
  }

  return response.json()
}

async function uploadSceneImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/settings/background-scene', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '上传背景图失败'))
  }

  return response.json()
}

async function clearSceneImage() {
  const response = await fetch('/api/settings/background-scene', { method: 'DELETE' })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '清除背景图失败'))
  }

  return response.json()
}

async function saveSiteProfile(profile: SiteProfile) {
  const response = await fetch('/api/settings/site-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '保存站点资料失败'))
  }

  return response.json()
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
    throw new Error(readApiError(error, '上传图片失败'))
  }

  return response.json() as Promise<{ url: string }>
}

async function uploadPostCoverPoolImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload/post-cover-pool', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(readApiError(error, '上传随机封面失败'))
  }

  return response.json() as Promise<{ url: string }>
}

function serializeGreetingPool(items: string[]) {
  return items.join('\n')
}

function parseGreetingPool(input: string) {
  return input
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeQuotePool(items: SiteProfile['homeQuotePool']) {
  return items.map((item) => `${item.text} | ${item.from}`).join('\n')
}

function parseQuotePool(input: string): SiteProfile['homeQuotePool'] {
  return input
    .split(/\r?\n/)
    .map((line, index) => {
      const raw = line.trim()
      if (!raw) return null

      const parts = raw.split('|')
      const text = parts[0]?.trim() ?? ''
      const from = parts.slice(1).join('|').trim() || '站点备忘'
      if (!text) return null

      return {
        id: `quote-${index + 1}`,
        text,
        from,
      }
    })
    .filter((item): item is SiteProfile['homeQuotePool'][number] => Boolean(item))
}

const HOME_PROFILE_ICON_OPTIONS = [
  { value: 'code', label: 'Code' },
  { value: 'mail', label: 'Mail' },
  { value: 'rss_feed', label: 'RSS' },
  { value: 'person', label: 'Person' },
  { value: 'home', label: 'Home' },
  { value: 'article', label: 'Article' },
  { value: 'inventory_2', label: 'Archive' },
  { value: 'folder', label: 'Category' },
  { value: 'sell', label: 'Tag' },
  { value: 'link', label: 'Link' },
  { value: 'travel_explore', label: 'Explore' },
  { value: 'deployed_code', label: 'Work' },
  { value: 'bolt', label: 'Moment' },
  { value: 'favorite', label: 'Favorite' },
  { value: 'smart_toy', label: 'AI' },
] as const

const HOME_PROFILE_LINK_FALLBACKS: SiteProfile['homeProfileLinks'] = [
  { id: 'github', label: 'GitHub', href: 'https://github.com', icon: 'code' },
  { id: 'email', label: '\u90ae\u7bb1', href: 'mailto:hello@haiy.space', icon: 'mail' },
  { id: 'rss', label: 'RSS', href: '/rss.xml', icon: 'rss_feed' },
  { id: 'about', label: '\u5173\u4e8e', href: '/about', icon: 'person' },
]

function ensureHomeProfileLinks(
  items?: SiteProfile['homeProfileLinks'] | null
): SiteProfile['homeProfileLinks'] {
  return Array.from({ length: 4 }, (_, index) => {
    const fallback = HOME_PROFILE_LINK_FALLBACKS[index]
    const current = items?.[index]

    return {
      id: current?.id || fallback.id,
      label: current?.label || fallback.label,
      href: current?.href || fallback.href,
      icon: current?.icon || fallback.icon,
    }
  })
}

function normalizeSiteAssetUrl(url?: string | null, siteUrl?: string | null) {
  const value = (url ?? '').trim()
  if (!value) return ''
  if (value.startsWith('/')) return value

  const brokenSameHost = value.match(/^https?:\/\/\/+([^/]+)(\/uploads\/.*)$/i)
  if (brokenSameHost) {
    try {
      const base = new URL((siteUrl || 'http://localhost:3000').trim())
      if (brokenSameHost[1]?.toLowerCase() === base.host.toLowerCase()) {
        return brokenSameHost[2]
      }
    } catch {
      return brokenSameHost[2]
    }
  }

  try {
    const target = new URL(value)
    const base = new URL((siteUrl || 'http://localhost:3000').trim())
    if (target.host === base.host && target.pathname.startsWith('/uploads/')) {
      return `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    return value
  }

  return value
}

export default function SettingsPage() {
  const sceneRequest = useSWR<BackgroundSceneSettings>('/api/settings/background-scene', fetcher)
  const profileRequest = useSWR<SiteProfile>('/api/settings/site-profile', fetcher)

  const [sceneForm, setSceneForm] = useState<BackgroundSceneSettings | null>(null)
  const [profileForm, setProfileForm] = useState<SiteProfile | null>(null)
  const [homeGreetingText, setHomeGreetingText] = useState('')
  const [homeQuoteText, setHomeQuoteText] = useState('')
  const [savingScene, setSavingScene] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingScene, setUploadingScene] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingDefaultCover, setUploadingDefaultCover] = useState(false)
  const [uploadingCoverPool, setUploadingCoverPool] = useState(false)
  const [uploadingGamesHero, setUploadingGamesHero] = useState(false)
  const [clearingScene, setClearingScene] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const sceneFileRef = useRef<HTMLInputElement>(null)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const defaultCoverFileRef = useRef<HTMLInputElement>(null)
  const postCoverPoolFileRef = useRef<HTMLInputElement>(null)
  const gamesHeroFileRef = useRef<HTMLInputElement>(null)
  const sceneFormRef = useRef<BackgroundSceneSettings | null>(null)
  const profileFormRef = useRef<SiteProfile | null>(null)

  useEffect(() => {
    if (sceneRequest.data) {
      sceneFormRef.current = sceneRequest.data
      setSceneForm(sceneRequest.data)
    }
  }, [sceneRequest.data])

  useEffect(() => {
    if (profileRequest.data) {
      const nextProfile = {
        ...profileRequest.data,
        homeProfileLinks: ensureHomeProfileLinks(profileRequest.data.homeProfileLinks),
      }
      profileFormRef.current = nextProfile
      setProfileForm({
        ...nextProfile,
      })
      setHomeGreetingText(serializeGreetingPool(profileRequest.data.homeGreetingPool))
      setHomeQuoteText(serializeQuotePool(profileRequest.data.homeQuotePool))
    }
  }, [profileRequest.data])

  function resetNotice() {
    setError('')
    setSuccess('')
  }

  function updateScene(updater: (current: BackgroundSceneSettings) => BackgroundSceneSettings) {
    setSceneForm((current) => {
      if (!current) return current
      const next = updater(current)
      sceneFormRef.current = next
      return next
    })
  }

  function updateProfile<Key extends keyof SiteProfile>(key: Key, value: SiteProfile[Key]) {
    setProfileForm((current) => {
      if (!current) return current
      const next = { ...current, [key]: value }
      profileFormRef.current = next
      return next
    })
  }

  function updateHomeProfileLink(
    index: number,
    key: keyof SiteProfile['homeProfileLinks'][number],
    value: string
  ) {
    setProfileForm((current) => {
      if (!current) return current

      const nextLinks = ensureHomeProfileLinks(current.homeProfileLinks).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )

      const next = {
        ...current,
        homeProfileLinks: nextLinks,
      }
      profileFormRef.current = next
      return next
    })
  }

  async function persistScene(showSuccessMessage = true) {
    const currentScene = sceneFormRef.current
    if (!currentScene) return null

    const next = await saveScene(currentScene)
    sceneRequest.mutate(next, false)
    sceneFormRef.current = next
    setSceneForm(next)

    if (showSuccessMessage) {
      setSuccess('首页 Hero 场景已保存，前台首页会同步读取新参数。')
    }

    return next
  }

  async function persistProfile(showSuccessMessage = true) {
    const currentProfile = profileFormRef.current
    if (!currentProfile) return null

    const next = await saveSiteProfile({
      ...currentProfile,
      homeProfileLinks: ensureHomeProfileLinks(currentProfile.homeProfileLinks),
      avatarUrl: normalizeSiteAssetUrl(currentProfile.avatarUrl, currentProfile.siteUrl) || null,
      defaultPostCoverUrl:
        normalizeSiteAssetUrl(currentProfile.defaultPostCoverUrl, currentProfile.siteUrl) || null,
      gamesHeroImageUrl:
        normalizeSiteAssetUrl(currentProfile.gamesHeroImageUrl, currentProfile.siteUrl) || null,
      postCoverPoolUrls: (currentProfile.postCoverPoolUrls ?? [])
        .map((item) => normalizeSiteAssetUrl(item, currentProfile.siteUrl))
        .filter(Boolean),
    })

    profileRequest.mutate(next, false)
    const normalizedNext = {
      ...next,
      homeProfileLinks: ensureHomeProfileLinks(next.homeProfileLinks),
    }
    profileFormRef.current = normalizedNext
    setProfileForm(normalizedNext)

    if (showSuccessMessage) {
      setSuccess('站点资料已保存。')
    }

    return next
  }

  async function handleSaveScene() {
    setSavingScene(true)
    resetNotice()

    try {
      await persistScene(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存场景设置失败')
    } finally {
      setSavingScene(false)
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    resetNotice()

    try {
      await persistProfile(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存站点资料失败')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveAll() {
    setSavingScene(true)
    setSavingProfile(true)
    resetNotice()

    try {
      await persistScene(false)
      await persistProfile(false)
      setSuccess('首页 Hero 和站点资料都已保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存设置失败')
    } finally {
      setSavingScene(false)
      setSavingProfile(false)
    }
  }

  async function handleSceneUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingScene(true)
    resetNotice()

    try {
      const next = await uploadSceneImage(file)
      sceneRequest.mutate(next, false)
      sceneFormRef.current = next
      setSceneForm(next)
      setSuccess('首页背景图已更新。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传背景图失败')
    } finally {
      setUploadingScene(false)
      if (sceneFileRef.current) sceneFileRef.current.value = ''
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    resetNotice()

    try {
      const result = await uploadImage(file)
      updateProfile('avatarUrl', normalizeSiteAssetUrl(result.url, profileForm?.siteUrl) || null)
      setSuccess('头像已上传，记得保存站点资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传头像失败')
    } finally {
      setUploadingAvatar(false)
      if (avatarFileRef.current) avatarFileRef.current.value = ''
    }
  }

  async function handleDefaultCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingDefaultCover(true)
    resetNotice()

    try {
      const result = await uploadImage(file)
      updateProfile(
        'defaultPostCoverUrl',
        normalizeSiteAssetUrl(result.url, profileForm?.siteUrl) || null
      )
      setSuccess('默认文章封面已上传，记得保存站点资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传默认封面失败')
    } finally {
      setUploadingDefaultCover(false)
      if (defaultCoverFileRef.current) defaultCoverFileRef.current.value = ''
    }
  }

  async function handleGamesHeroUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingGamesHero(true)
    resetNotice()

    try {
      const result = await uploadImage(file)
      updateProfile(
        'gamesHeroImageUrl',
        normalizeSiteAssetUrl(result.url, profileForm?.siteUrl) || null
      )
      setSuccess('游戏页 Hero 已上传，记得保存站点资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传游戏页 Hero 失败')
    } finally {
      setUploadingGamesHero(false)
      if (gamesHeroFileRef.current) gamesHeroFileRef.current.value = ''
    }
  }

  async function handlePostCoverPoolUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingCoverPool(true)
    resetNotice()

    try {
      const result = await uploadPostCoverPoolImage(file)
      updateProfile(
        'postCoverPoolUrls',
        Array.from(
          new Set([
            ...(profileForm?.postCoverPoolUrls ?? []),
            normalizeSiteAssetUrl(result.url, profileForm?.siteUrl),
          ].filter(Boolean))
        )
      )
      setSuccess('随机文章封面已上传，记得保存站点资料。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传随机封面失败')
    } finally {
      setUploadingCoverPool(false)
      if (postCoverPoolFileRef.current) postCoverPoolFileRef.current.value = ''
    }
  }

  function appendPostCoverPoolUrl(url: string) {
    updateProfile(
      'postCoverPoolUrls',
      Array.from(
        new Set([
          ...(profileForm?.postCoverPoolUrls ?? []),
          normalizeSiteAssetUrl(url, profileForm?.siteUrl),
        ].filter(Boolean))
      )
    )
  }

  function removePostCoverPoolUrl(targetUrl: string) {
    updateProfile(
      'postCoverPoolUrls',
      (profileForm?.postCoverPoolUrls ?? []).filter((url) => url !== targetUrl)
    )
  }

  async function handleClearSceneImage() {
    setClearingScene(true)
    resetNotice()

    try {
      const next = await clearSceneImage()
      sceneRequest.mutate(next, false)
      sceneFormRef.current = next
      setSceneForm(next)
      setSuccess('首页背景图已清除。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '清除背景图失败')
    } finally {
      setClearingScene(false)
    }
  }

  if (!sceneForm || !profileForm) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
            Site Console
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            全局设置
          </h1>
        </div>
        <div className="h-[260px] animate-pulse rounded-[28px] border border-border bg-card/70" />
        <div className="h-[620px] animate-pulse rounded-[28px] border border-border bg-card/70" />
      </div>
    )
  }

  const previewHasImage = Boolean(sceneForm.image.url)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Site Console"
        title="全局设置"
        description="统一维护站点资料、媒体资源、首页 Hero、默认文章封面和首页卡片内容。这里的修改会直接影响前台展示。"
        meta={
          <>
            <AdminStatusBadge tone="accent">媒体资源</AdminStatusBadge>
            <AdminStatusBadge tone="neutral">默认封面</AdminStatusBadge>
            <AdminStatusBadge tone="neutral">首页场景</AdminStatusBadge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={handleSaveScene} loading={savingScene || savingProfile}>
              <MaterialSymbol icon="wallpaper" size={18} />
              保存首页 Hero
            </Button>
            <Button onClick={handleSaveAll} loading={savingScene || savingProfile}>
              <MaterialSymbol icon="save" size={18} />
              保存全部
            </Button>
          </>
        }
      />

      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
      {success ? <AdminNotice tone="success">{success}</AdminNotice> : null}

      <AdminPanel
        title="品牌与媒体资源"
        description="把站点身份、头像、默认文章封面和游戏页 Hero 放在同一套媒体工作流里维护，后面会轻松很多。"
        icon="imagesmode"
      >
        <div className="space-y-6">
          <AdminSection
            title="站点基础资料"
            description="这些内容会同时影响导航、资料卡、关于页和 Moments 的作者信息。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="站点名称">
                <input
                  value={profileForm.siteName}
                  onChange={(event) => updateProfile('siteName', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="全局主题色">
                <input
                  type="color"
                  value={profileForm.themeColor}
                  onChange={(event) => updateProfile('themeColor', event.target.value)}
                  className="h-11 w-full rounded-[18px] border border-border/70 bg-background/55 px-2"
                />
              </AdminField>
              <AdminField label="英文副标">
                <input
                  value={profileForm.siteNameEn}
                  onChange={(event) => updateProfile('siteNameEn', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="博主名称">
                <input
                  value={profileForm.ownerName}
                  onChange={(event) => updateProfile('ownerName', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="头像缩写">
                <input
                  value={profileForm.ownerInitial}
                  onChange={(event) => updateProfile('ownerInitial', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="站点标语" fullWidth>
                <input
                  value={profileForm.slogan}
                  onChange={(event) => updateProfile('slogan', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="角色说明" fullWidth>
                <input
                  value={profileForm.roleLine}
                  onChange={(event) => updateProfile('roleLine', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="GitHub 链接">
                <input
                  value={profileForm.githubUrl}
                  onChange={(event) => updateProfile('githubUrl', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://github.com/your-name"
                />
              </AdminField>
              <AdminField label="联系邮箱">
                <input
                  value={profileForm.email}
                  onChange={(event) => updateProfile('email', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="hello@example.com"
                />
              </AdminField>
              <AdminField label="页脚文案" fullWidth>
                <input
                  value={profileForm.footerText}
                  onChange={(event) => updateProfile('footerText', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                />
              </AdminField>
              <AdminField label={'\u5907\u6848 ICP \u53f7'}>
                <input
                  value={profileForm.footerIcpNumber}
                  onChange={(event) => updateProfile('footerIcpNumber', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder={'\u4f8b\u5982\uff1a\u6caa ICP \u5907 2026000001 \u53f7'}
                />
              </AdminField>
              <AdminField label={'ICP \u8df3\u8f6c\u94fe\u63a5'}>
                <input
                  value={profileForm.footerIcpUrl}
                  onChange={(event) => updateProfile('footerIcpUrl', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://beian.miit.gov.cn/"
                />
              </AdminField>
              <AdminField label={'\u516c\u5b89\u5907\u6848\u53f7'}>
                <input
                  value={profileForm.footerPoliceNumber}
                  onChange={(event) => updateProfile('footerPoliceNumber', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder={'\u4f8b\u5982\uff1a\u6caa\u516c\u7f51\u5b89\u5907 31000000000001 \u53f7'}
                />
              </AdminField>
              <AdminField label={'\u516c\u5b89\u5907\u6848\u94fe\u63a5'}>
                <input
                  value={profileForm.footerPoliceUrl}
                  onChange={(event) => updateProfile('footerPoliceUrl', event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://beian.mps.gov.cn/"
                />
              </AdminField>
              <AdminField label="个人简介" fullWidth>
                <textarea
                  value={profileForm.bio}
                  onChange={(event) => updateProfile('bio', event.target.value)}
                  className={ADMIN_TEXTAREA_CLASS}
                  rows={5}
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection
            title="头像与默认文章封面"
            description="站点头像、文章默认封面和游戏页 Hero 背景都在这里统一维护，优先复用媒体库资源。"
            aside={<AdminStatusBadge tone="accent">Media Linked</AdminStatusBadge>}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <MediaAssetCard
                eyebrow="Avatar"
                title="站点头像"
                description="导航、首页资料卡和作者信息都会复用这张头像。"
                preview={
                  profileForm.avatarUrl ? (
                    <img
                      src={profileForm.avatarUrl}
                      alt={profileForm.ownerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-semibold text-primary">
                      {profileForm.ownerInitial || 'L'}
                    </span>
                  )
                }
                controls={
                  <>
                    <MediaLibraryPicker
                      value={profileForm.avatarUrl}
                      onSelect={(url) =>
                        updateProfile('avatarUrl', normalizeSiteAssetUrl(url, profileForm.siteUrl) || null)
                      }
                      buttonLabel="从相册选择"
                      dialogTitle="选择站点头像"
                      description="优先复用相册里的资源，也可以在弹窗里继续补传。"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => avatarFileRef.current?.click()}
                      loading={uploadingAvatar}
                    >
                      <MaterialSymbol icon="image_arrow_up" size={16} />
                      上传头像
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!profileForm.avatarUrl}
                      onClick={() => updateProfile('avatarUrl', null)}
                    >
                      <MaterialSymbol icon="delete" size={16} />
                      清空
                    </Button>
                  </>
                }
              />

              <MediaAssetCard
                eyebrow="Default Cover"
                title="默认文章封面"
                description="当文章本身没有设置封面时，前台列表、推荐位和正文页都会自动回退到这里。"
                preview={
                  profileForm.defaultPostCoverUrl ? (
                    <img
                      src={profileForm.defaultPostCoverUrl}
                      alt="默认文章封面"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/16 via-card to-muted text-primary/70">
                      <MaterialSymbol icon="image" size={34} />
                    </div>
                  )
                }
                controls={
                  <>
                    <MediaLibraryPicker
                      value={profileForm.defaultPostCoverUrl}
                      onSelect={(url) =>
                        updateProfile(
                          'defaultPostCoverUrl',
                          normalizeSiteAssetUrl(url, profileForm.siteUrl) || null
                        )
                      }
                      category="artwork"
                      buttonLabel="从相册选择"
                      dialogTitle="选择默认文章封面"
                      description="这里会作为文章封面的全局兜底图，建议选一张耐看的大图。"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => defaultCoverFileRef.current?.click()}
                      loading={uploadingDefaultCover}
                    >
                      <MaterialSymbol icon="image_arrow_up" size={16} />
                      上传新封面
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!profileForm.defaultPostCoverUrl}
                      onClick={() => updateProfile('defaultPostCoverUrl', null)}
                    >
                      <MaterialSymbol icon="delete" size={16} />
                      清空
                    </Button>
                  </>
                }
              />

              <MediaAssetCard
                eyebrow="Games Hero"
                title="游戏页 Hero 背景"
                description="会直接作为游戏页顶部 Hero 背景图，风格建议和动漫页保持一致。"
                preview={
                  profileForm.gamesHeroImageUrl ? (
                    <img
                      src={profileForm.gamesHeroImageUrl}
                      alt="游戏页 Hero 背景"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/16 via-card to-muted text-primary/70">
                      <MaterialSymbol icon="stadia_controller" size={34} />
                    </div>
                  )
                }
                controls={
                  <>
                    <MediaLibraryPicker
                      value={profileForm.gamesHeroImageUrl}
                      onSelect={(url) =>
                        updateProfile(
                          'gamesHeroImageUrl',
                          normalizeSiteAssetUrl(url, profileForm.siteUrl) || null
                        )
                      }
                      category="artwork"
                      buttonLabel="从相册选择"
                      dialogTitle="选择游戏页 Hero 背景"
                      description="支持直接复用媒体库里的封面、插画或截图，也可以在弹窗里继续上传。"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => gamesHeroFileRef.current?.click()}
                      loading={uploadingGamesHero}
                    >
                      <MaterialSymbol icon="image_arrow_up" size={16} />
                      上传 Hero 图
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!profileForm.gamesHeroImageUrl}
                      onClick={() => updateProfile('gamesHeroImageUrl', null)}
                    >
                      <MaterialSymbol icon="delete" size={16} />
                      清空
                    </Button>
                  </>
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <AdminField label="头像地址" hint="可以手动粘贴，也可以直接从相册选择或上传。">
                <input
                  value={profileForm.avatarUrl ?? ''}
                  onChange={(event) =>
                    updateProfile(
                      'avatarUrl',
                      normalizeSiteAssetUrl(event.target.value, profileForm.siteUrl) || null
                    )
                  }
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://example.com/avatar.jpg"
                />
              </AdminField>
              <AdminField
                label="默认封面地址"
                hint="留空则文章没有封面时显示默认占位图。设置后会成为全站文章封面的回退图。"
              >
                <input
                  value={profileForm.defaultPostCoverUrl ?? ''}
                  onChange={(event) =>
                    updateProfile(
                      'defaultPostCoverUrl',
                      normalizeSiteAssetUrl(event.target.value, profileForm.siteUrl) || null
                    )
                  }
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://example.com/default-cover.jpg"
                />
              </AdminField>
              <AdminField
                label="游戏 Hero 地址"
                hint="留空时会回退到游戏条目里的首张封面；设置后优先使用这里。"
              >
                <input
                  value={profileForm.gamesHeroImageUrl ?? ''}
                  onChange={(event) =>
                    updateProfile(
                      'gamesHeroImageUrl',
                      normalizeSiteAssetUrl(event.target.value, profileForm.siteUrl) || null
                    )
                  }
                  className={ADMIN_INPUT_CLASS}
                  placeholder="https://example.com/games-hero.jpg"
                />
              </AdminField>
            </div>
          </AdminSection>
        </div>

        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <input
          ref={defaultCoverFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleDefaultCoverUpload}
        />
        <input
          ref={gamesHeroFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleGamesHeroUpload}
        />
      </AdminPanel>

      <AdminPanel
        title="首页 Hero 场景"
        description="首页 Hero 会直接读取这里的背景、滤镜和雾感参数。这里保存后，前台首页会同步刷新。"
        icon="wallpaper"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => sceneFileRef.current?.click()}
              loading={uploadingScene}
            >
              <MaterialSymbol icon="image_arrow_up" size={18} />
              上传背景图
            </Button>
            <Button variant="ghost" onClick={handleClearSceneImage} disabled={clearingScene || !sceneForm.image.url}>
              <MaterialSymbol icon="delete" size={18} />
              {clearingScene ? '清除中...' : '清除背景图'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <AdminSection
            title="首页 Hero 预览"
            description="这里直接模拟首页首屏的真实叠层效果，滤镜、雾感和背景图会按前台同一套逻辑渲染。"
          >
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/40">
                <div className="relative aspect-[16/8] overflow-hidden bg-background/70">
                  {previewHasImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${sceneForm.image.url})`,
                        backgroundPosition: sceneForm.image.position,
                        backgroundSize: sceneForm.image.size,
                        opacity: sceneForm.image.opacity,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background/80" />
                  )}
                  <div className="absolute inset-0 overflow-hidden">
                    <SceneFilterLayer scene={sceneForm} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
                    <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-white/45">
                      Front Hero
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {profileForm.siteName}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-white/66">
                      {profileForm.slogan}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <AdminField label="背景位置">
                  <input
                    value={sceneForm.image.position}
                    onChange={(event) =>
                      updateScene((current) => ({
                        ...current,
                        image: { ...current.image, position: event.target.value },
                      }))
                    }
                    className={ADMIN_INPUT_CLASS}
                  />
                </AdminField>
                <AdminField label="背景尺寸">
                  <input
                    value={sceneForm.image.size}
                    onChange={(event) =>
                      updateScene((current) => ({
                        ...current,
                        image: { ...current.image, size: event.target.value },
                      }))
                    }
                    className={ADMIN_INPUT_CLASS}
                  />
                </AdminField>
                <RangeField
                  label="图片透明度"
                  value={sceneForm.image.opacity}
                  onChange={(value) =>
                    updateScene((current) => ({
                      ...current,
                      image: { ...current.image, opacity: value },
                    }))
                  }
                />
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title="滤镜与氛围"
            description="首页 Hero 现在直接复用这套滤镜。想压住雾感、亮部和边缘发白，就在这里调整蒙层、模糊和暗角。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <RangeField
                label="暗色蒙层"
                value={sceneForm.filter.overlay}
                onChange={(value) =>
                  updateScene((current) => ({
                    ...current,
                    filter: { ...current.filter, overlay: value },
                  }))
                }
              />
              <RangeField
                label="渐变深度"
                value={sceneForm.filter.gradient}
                onChange={(value) =>
                  updateScene((current) => ({
                    ...current,
                    filter: { ...current.filter, gradient: value },
                  }))
                }
              />
              <AdminField label="色彩倾向">
                <input
                  type="color"
                  value={sceneForm.filter.tintColor}
                  onChange={(event) =>
                    updateScene((current) => ({
                      ...current,
                      filter: { ...current.filter, tintColor: event.target.value },
                    }))
                  }
                  className="h-11 w-full rounded-[18px] border border-border/70 bg-background/55 px-2"
                />
              </AdminField>
              <RangeField
                label="模糊强度"
                value={sceneForm.filter.blur}
                min={0}
                max={24}
                step={1}
                onChange={(value) =>
                  updateScene((current) => ({
                    ...current,
                    filter: { ...current.filter, blur: value },
                  }))
                }
              />
              <RangeField
                label="边缘暗角"
                value={sceneForm.filter.vignette}
                onChange={(value) =>
                  updateScene((current) => ({
                    ...current,
                    filter: { ...current.filter, vignette: value },
                  }))
                }
              />
              <RangeField
                label="噪点强度"
                value={sceneForm.filter.noise}
                onChange={(value) =>
                  updateScene((current) => ({
                    ...current,
                    filter: { ...current.filter, noise: value },
                  }))
                }
              />
            </div>
          </AdminSection>

        </div>

          <AdminSection
            title="首页卡片配置"
            description="维护首页侧边栏的一言卡片、问候气泡和资料卡快捷入口。前台会直接从这里读取并随机展示。"
            aside={<AdminStatusBadge tone="accent">Homepage</AdminStatusBadge>}
          >
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <AdminField
                  label="问候语池"
                  hint="一行一句，资料卡顶部气泡会随机显示其中一条。"
                >
                  <textarea
                    value={homeGreetingText}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setHomeGreetingText(nextValue)
                      updateProfile('homeGreetingPool', parseGreetingPool(nextValue))
                    }}
                    rows={6}
                    className={ADMIN_TEXTAREA_CLASS}
                    placeholder={'凌晨好，别熬啦！\n下午好，继续向前。\n晚上好，欢迎回来。'}
                  />
                </AdminField>

                <AdminField
                  label="一言句库"
                  hint="一行一条，格式是“句子 | 来源”。来源不填时会默认显示为站点备忘。"
                >
                  <textarea
                    value={homeQuoteText}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setHomeQuoteText(nextValue)
                      updateProfile('homeQuotePool', parseQuotePool(nextValue))
                    }}
                    rows={6}
                    className={ADMIN_TEXTAREA_CLASS}
                    placeholder={'慢一点没关系，重要的是一直在靠近。| 站点备忘\n风会记得每一条认真走过的路。| 站点备忘'}
                  />
                </AdminField>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                  <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                    Greeting Preview
                  </p>
                  <div className="mt-4 rounded-[22px] border border-border/70 bg-background/44 p-4 text-sm text-foreground">
                    {(profileForm.homeGreetingPool[0] || '下午好，继续向前。').trim()}
                  </div>
                </div>

                <div className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
                  <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                    Quote Preview
                  </p>
                  <div className="mt-4 rounded-[22px] border border-border/70 bg-background/44 p-4">
                    <p className="text-sm font-medium leading-7 text-foreground">
                      “{profileForm.homeQuotePool[0]?.text || '慢一点没关系，重要的是一直在靠近。'}”
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {profileForm.homeQuotePool[0]?.from || '站点备忘'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {'\u9996\u9875\u8d44\u6599\u5361\u5feb\u6377\u5165\u53e3'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {
                      '\u56fe\u6807\u3001\u540d\u79f0\u548c\u94fe\u63a5\u90fd\u53ef\u4ee5\u5355\u72ec\u914d\u7f6e\u3002\u524d\u53f0\u4f1a\u76f4\u63a5\u4ece\u8fd9\u91cc\u8bfb\u53d6\u3002'
                    }
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {ensureHomeProfileLinks(profileForm.homeProfileLinks).map((item, index) => (
                    <div key={item.id} className={`${ADMIN_MUTED_PANEL_CLASS} space-y-4 p-4`}>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/48 text-foreground">
                          <MaterialSymbol icon={item.icon} size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {`\u5165\u53e3 ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.label || item.href}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label={'\u540d\u79f0'}>
                          <input
                            value={item.label}
                            onChange={(event) => updateHomeProfileLink(index, 'label', event.target.value)}
                            className={ADMIN_INPUT_CLASS}
                            placeholder={'\u4f8b\u5982\uff1aGitHub'}
                          />
                        </AdminField>
                        <AdminField label={'\u56fe\u6807'}>
                          <select
                            value={item.icon}
                            onChange={(event) => updateHomeProfileLink(index, 'icon', event.target.value)}
                            className={ADMIN_INPUT_CLASS}
                          >
                            {HOME_PROFILE_ICON_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </AdminField>
                      </div>

                      <AdminField
                        label={'\u94fe\u63a5'}
                        hint={'\u652f\u6301 /about\u3001https://example.com \u6216 mailto:hello@example.com'}
                      >
                        <input
                          value={item.href}
                          onChange={(event) => updateHomeProfileLink(index, 'href', event.target.value)}
                          className={ADMIN_INPUT_CLASS}
                          placeholder={index === 0 ? 'https://github.com/your-name' : '/about'}
                        />
                      </AdminField>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title="随机文章封面池"
            description="文章没有单独封面时，会从这里稳定随机抽取一张。后台上传的图片会单独存到 post-cover-pool 文件夹。"
            aside={
              <AdminStatusBadge tone="neutral">
                {profileForm.postCoverPoolUrls.length} 张
              </AdminStatusBadge>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => postCoverPoolFileRef.current?.click()}
                  loading={uploadingCoverPool}
                >
                  <MaterialSymbol icon="image_arrow_up" size={16} />
                  上传到随机封面池
                </Button>
                <MediaLibraryPicker
                  onSelect={appendPostCoverPoolUrl}
                  category="artwork"
                  buttonLabel="从相册加入"
                  dialogTitle="加入随机文章封面池"
                  description="这里选中的图片会进入文章随机封面池，供没有单独封面的文章回退使用。"
                />
              </div>

              {profileForm.postCoverPoolUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {profileForm.postCoverPoolUrls.map((url) => (
                    <div
                      key={url}
                      className="overflow-hidden rounded-[22px] border border-border/70 bg-background/44"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={url} alt="随机文章封面" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-3">
                        <p className="truncate text-[11px] font-mono text-muted-foreground">{url}</p>
                        <button
                          type="button"
                          onClick={() => removePostCoverPoolUrl(url)}
                          className="shrink-0 text-xs text-red-400 transition-colors hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${ADMIN_MUTED_PANEL_CLASS} p-5 text-sm text-muted-foreground`}>
                  还没有可用的随机封面。上传几张后，文章在未单独设置封面时就会自动从这里抽取。                </div>
              )}
            </div>
          </AdminSection>

        <input
          ref={postCoverPoolFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePostCoverPoolUpload}
        />

        <input
          ref={sceneFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSceneUpload}
        />
      </AdminPanel>
    </div>
  )
}

function MediaAssetCard({
  eyebrow,
  title,
  description,
  preview,
  controls,
}: {
  eyebrow: string
  title: string
  description: string
  preview: ReactNode
  controls: ReactNode
}) {
  return (
    <div className={`${ADMIN_MUTED_PANEL_CLASS} p-4`}>
      <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </p>
      <div className="mt-4 overflow-hidden rounded-[22px] border border-border/70 bg-background/44">
        <div className="aspect-[16/10] overflow-hidden">{preview}</div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{controls}</div>
    </div>
  )
}

function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-[hsl(var(--primary))]"
      />
    </div>
  )
}


