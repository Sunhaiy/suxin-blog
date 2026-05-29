import { storage } from '@/lib/storage/LocalStorage'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

/**
 * 把外链头像下载并保存到本地，返回本地 /uploads 路径。
 * - 空值：返回 null
 * - 已是本地路径（/ 开头）：原样返回
 * - 外链且下载成功：返回本地 /uploads 路径
 * - 下载失败 / 非图片 / 超限 / 超时：回退返回原始 URL（绝不丢头像）
 */
export async function ensureLocalAvatar(url?: string | null): Promise<string | null> {
  const value = url?.trim()
  if (!value) return null
  if (value.startsWith('/')) return value // 已是本地资源

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return value
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return value

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(value, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SuxinBlog/1.0; +friend-link avatar localizer)',
          Accept: 'image/*',
        },
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) return value
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.has(contentType)) return value

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_AVATAR_BYTES) return value

    const buffer = Buffer.from(arrayBuffer)
    const nameFromPath = parsed.pathname.split('/').filter(Boolean).pop() || 'avatar'
    const result = await storage.upload(buffer, nameFromPath, contentType, 'links')
    return result.url
  } catch {
    return value // 任何异常都回退到原始 URL，保证不丢头像
  }
}
