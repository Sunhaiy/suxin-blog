import { DEFAULT_SITE_PROFILE, getSiteProfile } from '@/lib/site'
import type { PostRow } from '@/types/post'

export type UrlChangeKind = 'updated' | 'deleted'

export interface UrlChange {
  url: string
  kind: UrlChangeKind
}

export interface SearchSubmissionResult {
  provider: 'indexnow' | 'baidu'
  status: 'submitted' | 'skipped' | 'failed'
  detail: string
  httpStatus?: number
}

export interface SyncPostSearchIndexArgs {
  before?: Pick<PostRow, 'slug' | 'status'> | null
  after?: Pick<PostRow, 'slug' | 'status'> | null
}

function trimToNull(value: string | null | undefined) {
  const next = value?.trim()
  return next ? next : null
}

function isPublishedPost(post: Pick<PostRow, 'slug' | 'status'> | null | undefined) {
  return Boolean(post && post.status === 'published' && trimToNull(post.slug))
}

function isSearchSubmitEnabled() {
  const raw = trimToNull(process.env.SEARCH_SUBMIT_ENABLED)
  if (!raw) return true

  return !['0', 'false', 'no', 'off'].includes(raw.toLowerCase())
}

function normalizeAbsoluteUrl(value: string) {
  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

function uniqueUrlChanges(changes: UrlChange[]) {
  const seen = new Set<string>()
  const output: UrlChange[] = []

  for (const change of changes) {
    const normalizedUrl = normalizeAbsoluteUrl(change.url)
    if (!normalizedUrl) continue

    const key = `${change.kind}:${normalizedUrl}`
    if (seen.has(key)) continue

    seen.add(key)
    output.push({ kind: change.kind, url: normalizedUrl })
  }

  return output
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveSiteOrigin() {
  try {
    const profile = await getSiteProfile()
    const siteUrl = trimToNull(profile.siteUrl)
    if (siteUrl) return new URL(siteUrl).origin
  } catch {}

  for (const candidate of [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    DEFAULT_SITE_PROFILE.siteUrl,
  ]) {
    const next = trimToNull(candidate)
    if (!next) continue

    try {
      return new URL(next).origin
    } catch {}
  }

  return null
}

export function buildPostUrl(siteOrigin: string, slug: string) {
  const safeSlug = trimToNull(slug)
  if (!safeSlug) return null

  try {
    return new URL(`/posts/${safeSlug}`, `${siteOrigin}/`).toString()
  } catch {
    return null
  }
}

function collectPostUrlChanges(
  siteOrigin: string,
  before?: Pick<PostRow, 'slug' | 'status'> | null,
  after?: Pick<PostRow, 'slug' | 'status'> | null
) {
  const changes: UrlChange[] = []
  const publishedBefore = isPublishedPost(before) ? before : null
  const publishedAfter = isPublishedPost(after) ? after : null

  if (publishedBefore) {
    const oldUrl = buildPostUrl(siteOrigin, publishedBefore.slug)
    const slugChanged =
      !publishedAfter || trimToNull(publishedBefore.slug) !== trimToNull(publishedAfter.slug)

    if (oldUrl && (!publishedAfter || slugChanged)) {
      changes.push({ kind: 'deleted', url: oldUrl })
    }
  }

  if (publishedAfter) {
    const newUrl = buildPostUrl(siteOrigin, publishedAfter.slug)
    if (newUrl) {
      changes.push({ kind: 'updated', url: newUrl })
    }
  }

  return uniqueUrlChanges(changes)
}

function resolveIndexNowKeyLocation(siteOrigin: string) {
  const configured = trimToNull(process.env.INDEXNOW_KEY_LOCATION)
  if (!configured) return `${siteOrigin}/indexnow-key.txt`

  try {
    return new URL(configured, `${siteOrigin}/`).toString()
  } catch {
    return `${siteOrigin}/indexnow-key.txt`
  }
}

async function submitToIndexNow(
  changes: UrlChange[],
  siteOrigin: string
): Promise<SearchSubmissionResult> {
  const key = trimToNull(process.env.INDEXNOW_KEY)
  if (!key) {
    return {
      provider: 'indexnow',
      status: 'skipped',
      detail: 'INDEXNOW_KEY 未配置，已跳过。',
    }
  }

  const urls = Array.from(new Set(changes.map((change) => change.url)))
  if (urls.length === 0) {
    return {
      provider: 'indexnow',
      status: 'skipped',
      detail: '没有可提交的 URL。',
    }
  }

  const endpoint = trimToNull(process.env.INDEXNOW_ENDPOINT) ?? 'https://api.indexnow.org/indexnow'
  const host = new URL(siteOrigin).host
  const keyLocation = resolveIndexNowKeyLocation(siteOrigin)

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host,
          key,
          keyLocation,
          urlList: urls,
        }),
      },
      5000
    )
    const detail = trimToNull(await response.text())

    if (!response.ok) {
      return {
        provider: 'indexnow',
        status: 'failed',
        httpStatus: response.status,
        detail: detail ?? `IndexNow 返回 ${response.status}`,
      }
    }

    return {
      provider: 'indexnow',
      status: 'submitted',
      httpStatus: response.status,
      detail: detail ?? `已提交 ${urls.length} 个 URL 到 IndexNow。`,
    }
  } catch (error) {
    return {
      provider: 'indexnow',
      status: 'failed',
      detail: error instanceof Error ? error.message : 'IndexNow 提交失败',
    }
  }
}

async function submitToBaidu(changes: UrlChange[]): Promise<SearchSubmissionResult> {
  const token = trimToNull(process.env.BAIDU_TOKEN)
  if (!token) {
    return {
      provider: 'baidu',
      status: 'skipped',
      detail: 'BAIDU_TOKEN 未配置，已跳过。',
    }
  }

  const urls = Array.from(
    new Set(changes.filter((change) => change.kind === 'updated').map((change) => change.url))
  )
  if (urls.length === 0) {
    return {
      provider: 'baidu',
      status: 'skipped',
      detail: '百度仅提交当前可访问 URL，本次没有可提交项。',
    }
  }

  const endpoint = trimToNull(process.env.BAIDU_SUBMIT_ENDPOINT) ?? 'http://data.zz.baidu.com/urls'
  const site = trimToNull(process.env.BAIDU_SITE) ?? new URL(urls[0]).host
  const submitType = trimToNull(process.env.BAIDU_SUBMIT_TYPE)
  const api = new URL(endpoint)

  api.searchParams.set('site', site)
  api.searchParams.set('token', token)
  if (submitType) {
    api.searchParams.set('type', submitType)
  }

  try {
    const response = await fetchWithTimeout(
      api.toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: urls.join('\n'),
      },
      5000
    )
    const detail = trimToNull(await response.text())

    if (!response.ok) {
      return {
        provider: 'baidu',
        status: 'failed',
        httpStatus: response.status,
        detail: detail ?? `百度提交返回 ${response.status}`,
      }
    }

    return {
      provider: 'baidu',
      status: 'submitted',
      httpStatus: response.status,
      detail: detail ?? `已提交 ${urls.length} 个 URL 到百度。`,
    }
  } catch (error) {
    return {
      provider: 'baidu',
      status: 'failed',
      detail: error instanceof Error ? error.message : '百度提交失败',
    }
  }
}

export async function submitUrlChanges(
  changes: UrlChange[],
  options?: { siteOrigin?: string | null }
) {
  if (!isSearchSubmitEnabled()) {
    return [
      {
        provider: 'indexnow',
        status: 'skipped',
        detail: 'SEARCH_SUBMIT_ENABLED=false，已关闭自动提交。',
      },
      {
        provider: 'baidu',
        status: 'skipped',
        detail: 'SEARCH_SUBMIT_ENABLED=false，已关闭自动提交。',
      },
    ] satisfies SearchSubmissionResult[]
  }

  const normalizedChanges = uniqueUrlChanges(changes)
  if (normalizedChanges.length === 0) {
    return [
      {
        provider: 'indexnow',
        status: 'skipped',
        detail: '没有合法的绝对 URL 可提交。',
      },
      {
        provider: 'baidu',
        status: 'skipped',
        detail: '没有合法的绝对 URL 可提交。',
      },
    ] satisfies SearchSubmissionResult[]
  }

  const siteOrigin =
    options?.siteOrigin ??
    (await resolveSiteOrigin()) ??
    new URL(normalizedChanges[0].url).origin

  const [indexNowResult, baiduResult] = await Promise.all([
    submitToIndexNow(normalizedChanges, siteOrigin),
    submitToBaidu(normalizedChanges),
  ])

  return [indexNowResult, baiduResult]
}

export async function syncPostSearchIndex(args: SyncPostSearchIndexArgs) {
  const siteOrigin = await resolveSiteOrigin()
  if (!siteOrigin) {
    return [
      {
        provider: 'indexnow',
        status: 'failed',
        detail: '无法解析站点域名，未执行自动提交。',
      },
      {
        provider: 'baidu',
        status: 'failed',
        detail: '无法解析站点域名，未执行自动提交。',
      },
    ] satisfies SearchSubmissionResult[]
  }

  const changes = collectPostUrlChanges(siteOrigin, args.before, args.after)
  return submitUrlChanges(changes, { siteOrigin })
}
