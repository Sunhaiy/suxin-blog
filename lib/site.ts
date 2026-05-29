import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { SETTINGS_KEYS } from '@/lib/constants/settings'
import { getSettings, setSetting } from '@/lib/db/dao/settingsDao'
import type { SiteProfile } from '@/types/site'

const DEFAULT_ABOUT_STRENGTHS: SiteProfile['aboutStrengths'] = [
  { icon: 'language', title: '前端开发', lines: ['Vue / React', 'TypeScript'] },
  { icon: 'dns', title: '后端开发', lines: ['Node.js / PostgreSQL', 'MySQL / SEO'] },
  { icon: 'phone_iphone', title: '移动开发', lines: ['Kotlin / Android', '独立开发上线'] },
  { icon: 'psychology', title: 'AI 构建', lines: ['从零实现 LLM', 'AI Agent / 工具产品化'] },
  { icon: 'deployed_code', title: '产品落地', lines: ['产品设计', '从创意到部署 / 独立完成'] },
]

const DEFAULT_ABOUT_LIFESTYLE_ITEMS: SiteProfile['aboutLifestyleItems'] = [
  {
    id: 'guitar',
    icon: 'music_note',
    label: '弹吉他',
    title: '把旋律变成另一种写代码的节奏',
    eyebrow: 'Default video',
    description:
      '默认展示弹吉他影像。它和写代码很像：先找到节奏，再让每一次手指落点都变得确定。',
    mediaType: 'video',
    mediaUrl: '/uploads/lifestyle/guitar.mp4',
    posterUrl: '/uploads/scene/2026/05/34afb641bd5e097e.jpg',
  },
  {
    id: 'minimal',
    icon: 'sentiment_satisfied',
    label: '极简审美',
    title: '去掉多余的噪声，只留下真正有用的部分',
    eyebrow: 'Minimal taste',
    description: '界面、文字和生活都尽量保持清爽，让注意力回到内容本身。',
    mediaType: 'image',
    mediaUrl: '/uploads/gallery/2026/05/555799c2e2eaa10e.jpg',
    posterUrl: null,
  },
  {
    id: 'music',
    icon: 'headphones',
    label: '热爱音乐',
    title: '音乐是日常里的缓冲区',
    eyebrow: 'Music lover',
    description: '用音乐给思考留一点呼吸，也给漫长的开发过程一个柔软的背景。',
    mediaType: 'image',
    mediaUrl: '/uploads/images/2026/05/141504dc9504d809.jpg',
    posterUrl: null,
  },
  {
    id: 'sport',
    icon: 'directions_run',
    label: '持续运动',
    title: '让身体也参与长期主义',
    eyebrow: 'Keep moving',
    description: '运动不是为了证明什么，只是提醒自己：状态也需要维护和迭代。',
    mediaType: 'image',
    mediaUrl: '/uploads/scene/2026/05/6fec9081e0b0ec6e.jpg',
    posterUrl: null,
  },
  {
    id: 'creation',
    icon: 'lightbulb',
    label: '热爱创新',
    title: '把一闪而过的念头做成可运行的东西',
    eyebrow: 'Creative build',
    description: '好奇心负责点火，工程能力负责把火苗保护成一个真实产品。',
    mediaType: 'image',
    mediaUrl: '/uploads/covers/2026/05/56c29f92b4991b01.jpg',
    posterUrl: null,
  },
]

const DEFAULT_HOME_GREETINGS: SiteProfile['homeGreetingPool'] = [
  '凌晨好，别熬啦！',
  '早上好，今天也慢慢来。',
  '中午好，记得休息。',
  '下午好，继续向前。',
  '晚上好，欢迎回来。',
]

const DEFAULT_HOME_QUOTES: SiteProfile['homeQuotePool'] = [
  { id: 'quote-1', text: '风会记得每一条认真走过的路。', from: '站点备忘' },
  { id: 'quote-2', text: '慢一点没关系，重要的是一直在靠近。', from: '站点备忘' },
  { id: 'quote-3', text: '把日常过细一点，生活就会亮一点。', from: '站点备忘' },
]

function buildDefaultHomeProfileLinks(source?: {
  githubUrl?: string
  email?: string
  rssUrl?: string
}): SiteProfile['homeProfileLinks'] {
  const githubUrl = cleanText(source?.githubUrl) || 'https://github.com'
  const email = cleanText(source?.email) || 'hello@haiy.space'
  const rssUrl = cleanText(source?.rssUrl) || '/rss.xml'

  return [
    { id: 'github', label: 'GitHub', href: githubUrl, icon: 'code' },
    { id: 'email', label: '\u90ae\u7bb1', href: `mailto:${email}`, icon: 'mail' },
    { id: 'rss', label: 'RSS', href: rssUrl, icon: 'rss_feed' },
    { id: 'about', label: '\u5173\u4e8e', href: '/about', icon: 'person' },
  ]
}

export const DEFAULT_SITE_PROFILE: SiteProfile = {
  siteName: '素心',
  siteNameEn: 'SUXIN BLOG',
  ownerName: '素心',
  ownerInitial: '素',
  themeColor: '#10b981',
  slogan: '期待是醒着的梦',
  roleLine: '程序员',
  bio: '嵌入式工程师、全栈构建者，也认真记录深夜、项目和碎片念头。',
  avatarUrl: null,
  defaultPostCoverUrl: null,
  postCoverPoolUrls: [],
  homeGreetingPool: DEFAULT_HOME_GREETINGS,
  homeQuotePool: DEFAULT_HOME_QUOTES,
  homeProfileLinks: buildDefaultHomeProfileLinks({
    githubUrl: 'https://github.com',
    email: 'hello@haiy.space',
    rssUrl: '/rss.xml',
  }),
  gamesHeroImageUrl: null,
  siteUrl: 'https://haiy.space',
  rssUrl: '/rss.xml',
  friendLinkIntro:
    '如果你也在认真维护自己的站点，欢迎把信息留在这里。看到合适的站点后，我会尽快回访并补上链接。',
  friendLinkRequirements:
    '1. 站点可以稳定访问\n2. 有持续更新的内容\n3. 优先博客、作品集、个人主页或有明确主题的工具站\n4. 简介尽量简洁，方便我快速了解你的站点',
  githubUrl: 'https://github.com',
  email: 'hello@haiy.space',
  footerIcpNumber: '',
  footerIcpUrl: '',
  footerPoliceNumber: '',
  footerPoliceUrl: '',
  footerText: '认知驾驶风险',
  aboutHeroName: '孙海洋',
  aboutHeroNameEn: 'Sun Haiyang',
  aboutHeroRoleLine: '全栈开发者 / Android 开发者 / AI Builder',
  aboutHeroBio:
    '崇拜技术力量，热爱探索未知边界，享受从 0 到 1 创造产品。独立开发并上线移动端 App「来生」、个人全栈博客「素心」，以及 AI 驱动的跨平台 SSH 终端工具「Reflex」。擅长将创意、设计、编码、部署与上线完整打通。',
  aboutHeroPortraitUrl: null,
  aboutNameplateLogoTop: 'SU',
  aboutNameplateLogoBottom: 'XIN',
  aboutNameplateTitle: 'Suxin Design Studio / 素心设计',
  aboutNameplateSubtitle: '我们的真本事！请您往下见真章！',
  aboutNameplateEnglish: 'Suxin Design Studio What We Do! Please Read The Chapter Below!',
  aboutClosingTitle: '从创意、设计、编码到部署上线，\n所有项目均由我独立完成。',
  aboutClosingDescription: '期待用技术与创造力，与世界一起去冒险、去创造。',
  aboutContactEmail: 's744129991@outlook.com',
  aboutStrengths: DEFAULT_ABOUT_STRENGTHS,
  aboutFeaturedWorkIds: [],
  aboutLifestyleItems: DEFAULT_ABOUT_LIFESTYLE_ITEMS,
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanOptionalUrl(value: unknown) {
  const next = cleanText(value)
  return next || null
}

function normalizeAssetUrl(value: unknown, siteUrl: string) {
  const next = cleanText(value)
  if (!next) return null
  if (next.startsWith('/')) return next

  const brokenSameHost = next.match(/^https?:\/\/\/+([^/]+)(\/uploads\/.*)$/i)
  if (brokenSameHost) {
    try {
      const base = new URL(siteUrl)
      if (brokenSameHost[1]?.toLowerCase() === base.host.toLowerCase()) {
        return brokenSameHost[2]
      }
    } catch {
      return brokenSameHost[2]
    }
  }

  try {
    const target = new URL(next)
    const base = new URL(siteUrl)
    const sameHost = target.host === base.host
    if (sameHost && target.pathname.startsWith('/uploads/')) {
      return `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    return next
  }

  return next
}

function firstCharacter(value: string) {
  return Array.from(value.trim())[0] ?? DEFAULT_SITE_PROFILE.ownerInitial
}

function looksAsciiLabel(value: string) {
  return /^[\x00-\x7F]+$/.test(value)
}

function normalizeThemeColor(value: unknown) {
  const next = cleanText(value)
  return /^#([0-9a-fA-F]{6})$/.test(next) ? next : DEFAULT_SITE_PROFILE.themeColor
}

function cloneAboutStrengths(items: SiteProfile['aboutStrengths']) {
  return items.map((item) => ({ ...item, lines: [...item.lines] }))
}

function cloneAboutLifestyleItems(items: SiteProfile['aboutLifestyleItems']) {
  return items.map((item) => ({ ...item }))
}

function cloneHomeQuotes(items: SiteProfile['homeQuotePool']) {
  return items.map((item) => ({ ...item }))
}

function cloneGreetingPool(items: SiteProfile['homeGreetingPool']) {
  return [...items]
}

function cloneHomeProfileLinks(items: SiteProfile['homeProfileLinks']) {
  return items.map((item) => ({ ...item }))
}

function normalizeAboutStrengths(value: unknown): SiteProfile['aboutStrengths'] {
  if (!Array.isArray(value)) return cloneAboutStrengths(DEFAULT_ABOUT_STRENGTHS)

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const source = item as Partial<SiteProfile['aboutStrengths'][number]>
      const title = cleanText(source.title)
      const lines = Array.isArray(source.lines)
        ? source.lines.map(cleanText).filter(Boolean).slice(0, 4)
        : []

      if (!title && lines.length === 0) return null

      return {
        icon: cleanText(source.icon) || 'star',
        title: title || `能力 ${index + 1}`,
        lines,
      }
    })
    .filter((item): item is SiteProfile['aboutStrengths'][number] => Boolean(item))
    .slice(0, 8)

  return items.length ? items : cloneAboutStrengths(DEFAULT_ABOUT_STRENGTHS)
}

function normalizeAboutFeaturedWorkIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []

  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)

  return Array.from(new Set(ids)).slice(0, 4)
}

function normalizeGreetingPool(value: unknown): SiteProfile['homeGreetingPool'] {
  if (!Array.isArray(value)) return cloneGreetingPool(DEFAULT_HOME_GREETINGS)

  const items = value.map(cleanText).filter(Boolean).slice(0, 16)
  return items.length ? items : cloneGreetingPool(DEFAULT_HOME_GREETINGS)
}

function normalizeHomeQuotePool(value: unknown): SiteProfile['homeQuotePool'] {
  if (!Array.isArray(value)) return cloneHomeQuotes(DEFAULT_HOME_QUOTES)

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const source = item as Partial<SiteProfile['homeQuotePool'][number]>
      const text = cleanText(source.text)
      if (!text) return null

      return {
        id: cleanText(source.id) || `quote-${index + 1}`,
        text,
        from: cleanText(source.from) || '站点备忘',
      }
    })
    .filter((item): item is SiteProfile['homeQuotePool'][number] => Boolean(item))
    .slice(0, 24)

  return items.length ? items : cloneHomeQuotes(DEFAULT_HOME_QUOTES)
}

function normalizeHomeProfileLinks(
  value: unknown,
  defaults: SiteProfile['homeProfileLinks']
): SiteProfile['homeProfileLinks'] {
  if (!Array.isArray(value)) return cloneHomeProfileLinks(defaults)

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const source = item as Partial<SiteProfile['homeProfileLinks'][number]>
      const fallback = defaults[index] ?? defaults[0]
      const label = cleanText(source.label) || fallback?.label || `Link ${index + 1}`
      const href = cleanText(source.href) || fallback?.href || ''
      const icon = cleanText(source.icon) || fallback?.icon || 'star'

      return {
        id: cleanText(source.id) || fallback?.id || `home-link-${index + 1}`,
        label,
        href,
        icon,
      }
    })
    .filter((item): item is SiteProfile['homeProfileLinks'][number] => Boolean(item))
    .slice(0, 8)

  return items.length ? items : cloneHomeProfileLinks(defaults)
}

function normalizePostCoverPool(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(new Set(value.map(cleanText).filter(Boolean))).slice(0, 48)
}

function normalizeAboutLifestyleItems(value: unknown): SiteProfile['aboutLifestyleItems'] {
  if (!Array.isArray(value)) return cloneAboutLifestyleItems(DEFAULT_ABOUT_LIFESTYLE_ITEMS)

  const items = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null

      const source = item as Partial<SiteProfile['aboutLifestyleItems'][number]>
      const id = cleanText(source.id) || `lifestyle-${index + 1}`
      const label = cleanText(source.label)
      const mediaType = source.mediaType === 'video' ? 'video' : 'image'
      const mediaUrl = cleanText(source.mediaUrl)
      const posterUrl = cleanOptionalUrl(source.posterUrl)

      if (!label && !mediaUrl) return null

      return {
        id,
        icon: cleanText(source.icon) || 'star',
        label: label || `生活方式 ${index + 1}`,
        title: cleanText(source.title) || label || `生活方式 ${index + 1}`,
        eyebrow: cleanText(source.eyebrow) || (mediaType === 'video' ? 'Video' : 'Image'),
        description: cleanText(source.description),
        mediaType,
        mediaUrl: mediaUrl || posterUrl || DEFAULT_ABOUT_LIFESTYLE_ITEMS[0].mediaUrl,
        posterUrl,
      }
    })
    .filter((item): item is SiteProfile['aboutLifestyleItems'][number] => Boolean(item))
    .slice(0, 8)

  return items.length ? items : cloneAboutLifestyleItems(DEFAULT_ABOUT_LIFESTYLE_ITEMS)
}

export function normalizeSiteProfile(input?: Partial<SiteProfile> | null): SiteProfile {
  const source = input ?? {}
  const siteName = cleanText(source.siteName) || DEFAULT_SITE_PROFILE.siteName
  const ownerName = cleanText(source.ownerName) || siteName || DEFAULT_SITE_PROFILE.ownerName
  const ownerInitial = cleanText(source.ownerInitial) || firstCharacter(ownerName || siteName)
  const siteUrl = cleanText(source.siteUrl) || DEFAULT_SITE_PROFILE.siteUrl
  const githubUrl = cleanText(source.githubUrl) || DEFAULT_SITE_PROFILE.githubUrl
  const email = cleanText(source.email) || DEFAULT_SITE_PROFILE.email
  const rssUrl = cleanText(source.rssUrl) || DEFAULT_SITE_PROFILE.rssUrl
  const homeProfileLinkDefaults = buildDefaultHomeProfileLinks({
    githubUrl,
    email,
    rssUrl,
  })

  return {
    siteName,
    siteNameEn: cleanText(source.siteNameEn) || DEFAULT_SITE_PROFILE.siteNameEn,
    ownerName,
    ownerInitial,
    themeColor: normalizeThemeColor(source.themeColor),
    slogan: cleanText(source.slogan) || DEFAULT_SITE_PROFILE.slogan,
    roleLine: cleanText(source.roleLine) || DEFAULT_SITE_PROFILE.roleLine,
    bio: cleanText(source.bio) || DEFAULT_SITE_PROFILE.bio,
    avatarUrl: normalizeAssetUrl(source.avatarUrl, siteUrl),
    defaultPostCoverUrl: normalizeAssetUrl(source.defaultPostCoverUrl, siteUrl),
    postCoverPoolUrls: normalizePostCoverPool(source.postCoverPoolUrls).map((item) =>
      normalizeAssetUrl(item, siteUrl)
    ).filter((item): item is string => Boolean(item)),
    homeGreetingPool: normalizeGreetingPool(source.homeGreetingPool),
    homeQuotePool: normalizeHomeQuotePool(source.homeQuotePool),
    homeProfileLinks: normalizeHomeProfileLinks(source.homeProfileLinks, homeProfileLinkDefaults),
    gamesHeroImageUrl: normalizeAssetUrl(source.gamesHeroImageUrl, siteUrl),
    siteUrl,
    rssUrl,
    friendLinkIntro: cleanText(source.friendLinkIntro) || DEFAULT_SITE_PROFILE.friendLinkIntro,
    friendLinkRequirements:
      cleanText(source.friendLinkRequirements) || DEFAULT_SITE_PROFILE.friendLinkRequirements,
    githubUrl,
    email,
    footerText: cleanText(source.footerText) || DEFAULT_SITE_PROFILE.footerText,
    footerIcpNumber: cleanText(source.footerIcpNumber),
    footerIcpUrl: cleanText(source.footerIcpUrl),
    footerPoliceNumber: cleanText(source.footerPoliceNumber),
    footerPoliceUrl: cleanText(source.footerPoliceUrl),
    aboutHeroName: cleanText(source.aboutHeroName) || DEFAULT_SITE_PROFILE.aboutHeroName,
    aboutHeroNameEn: cleanText(source.aboutHeroNameEn) || DEFAULT_SITE_PROFILE.aboutHeroNameEn,
    aboutHeroRoleLine:
      cleanText(source.aboutHeroRoleLine) || cleanText(source.roleLine) || DEFAULT_SITE_PROFILE.aboutHeroRoleLine,
    aboutHeroBio: cleanText(source.aboutHeroBio) || DEFAULT_SITE_PROFILE.aboutHeroBio,
    aboutHeroPortraitUrl: normalizeAssetUrl(source.aboutHeroPortraitUrl, siteUrl),
    aboutNameplateLogoTop:
      cleanText(source.aboutNameplateLogoTop) || DEFAULT_SITE_PROFILE.aboutNameplateLogoTop,
    aboutNameplateLogoBottom:
      cleanText(source.aboutNameplateLogoBottom) || DEFAULT_SITE_PROFILE.aboutNameplateLogoBottom,
    aboutNameplateTitle:
      cleanText(source.aboutNameplateTitle) || DEFAULT_SITE_PROFILE.aboutNameplateTitle,
    aboutNameplateSubtitle:
      cleanText(source.aboutNameplateSubtitle) || DEFAULT_SITE_PROFILE.aboutNameplateSubtitle,
    aboutNameplateEnglish:
      cleanText(source.aboutNameplateEnglish) || DEFAULT_SITE_PROFILE.aboutNameplateEnglish,
    aboutClosingTitle:
      cleanText(source.aboutClosingTitle) || DEFAULT_SITE_PROFILE.aboutClosingTitle,
    aboutClosingDescription:
      cleanText(source.aboutClosingDescription) || DEFAULT_SITE_PROFILE.aboutClosingDescription,
    aboutContactEmail:
      cleanText(source.aboutContactEmail) || DEFAULT_SITE_PROFILE.aboutContactEmail,
    aboutStrengths: normalizeAboutStrengths(source.aboutStrengths),
    aboutFeaturedWorkIds: normalizeAboutFeaturedWorkIds(source.aboutFeaturedWorkIds),
    aboutLifestyleItems: normalizeAboutLifestyleItems(source.aboutLifestyleItems),
  }
}

function fromLegacySettings(
  legacyName: string,
  legacyValues: Partial<SiteProfile>
): Partial<SiteProfile> {
  const trimmedName = legacyName.trim()

  if (!trimmedName) return legacyValues

  if (looksAsciiLabel(trimmedName)) {
    return {
      ...legacyValues,
      siteName: DEFAULT_SITE_PROFILE.siteName,
      siteNameEn: legacyValues.siteNameEn || trimmedName,
      ownerName: legacyValues.ownerName || DEFAULT_SITE_PROFILE.ownerName,
    }
  }

  return {
    ...legacyValues,
    siteName: legacyValues.siteName || trimmedName,
    ownerName: legacyValues.ownerName || trimmedName,
  }
}

const getSiteProfileCached = unstable_cache(
  async (): Promise<SiteProfile> => {
    const settings = await getSettings<Partial<SiteProfile> | string | null>([
      SETTINGS_KEYS.SITE_PROFILE,
      SETTINGS_KEYS.SITE_NAME,
      SETTINGS_KEYS.SITE_SLOGAN,
      SETTINGS_KEYS.SITE_BIO,
      SETTINGS_KEYS.SITE_AVATAR,
      SETTINGS_KEYS.SITE_GITHUB,
      SETTINGS_KEYS.SITE_EMAIL,
    ])

    const profileSetting = settings[SETTINGS_KEYS.SITE_PROFILE] as Partial<SiteProfile> | null
    const siteName = settings[SETTINGS_KEYS.SITE_NAME]
    const slogan = settings[SETTINGS_KEYS.SITE_SLOGAN]
    const bio = settings[SETTINGS_KEYS.SITE_BIO]
    const avatar = settings[SETTINGS_KEYS.SITE_AVATAR]
    const github = settings[SETTINGS_KEYS.SITE_GITHUB]
    const email = settings[SETTINGS_KEYS.SITE_EMAIL]

    const legacyValues = fromLegacySettings(cleanText(siteName), {
      slogan: cleanText(slogan),
      bio: cleanText(bio),
      avatarUrl: cleanText(avatar ?? ''),
      githubUrl: cleanText(github),
      email: cleanText(email),
    })

    return normalizeSiteProfile({
      ...legacyValues,
      ...(profileSetting ?? {}),
    })
  },
  ['site-profile'],
  {
    revalidate: 300,
    tags: ['site-profile', 'settings'],
  }
)

export async function getSiteProfile(): Promise<SiteProfile> {
  return getSiteProfileCached()
}

export async function persistSiteProfile(profile: SiteProfile) {
  const normalized = normalizeSiteProfile(profile)

  await Promise.all([
    setSetting(SETTINGS_KEYS.SITE_PROFILE, normalized, 'Global site profile settings'),
    setSetting(SETTINGS_KEYS.SITE_NAME, normalized.siteName, 'Site name'),
    setSetting(SETTINGS_KEYS.SITE_SLOGAN, normalized.slogan, 'Site slogan'),
    setSetting(SETTINGS_KEYS.SITE_BIO, normalized.bio, 'Short biography'),
    setSetting(SETTINGS_KEYS.SITE_AVATAR, normalized.avatarUrl, 'Avatar URL'),
    setSetting(SETTINGS_KEYS.SITE_GITHUB, normalized.githubUrl, 'GitHub profile URL'),
    setSetting(SETTINGS_KEYS.SITE_EMAIL, normalized.email, 'Contact email'),
  ])

  revalidateTag('site-profile')
  revalidateTag('settings')
  revalidatePath('/')
  revalidatePath('/links')
  revalidatePath('/about')
  revalidatePath('/posts')
  revalidatePath('/moments')
  revalidatePath('/works')
  revalidatePath('/anime')
  revalidatePath('/games')

  return normalized
}
