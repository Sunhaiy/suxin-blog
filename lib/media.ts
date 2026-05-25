export function resolveMediaUrl(primary?: string | null, fallback?: string | null) {
  return primary || fallback || null
}

export function isLocalMediaUrl(url?: string | null) {
  return Boolean(url && url.startsWith('/'))
}

export function getOptimizedMediaUrl(
  url?: string | null,
  options?: { width?: number; quality?: number }
) {
  if (!url) return null
  if (!isLocalMediaUrl(url)) return url

  const width = options?.width ?? 1200
  const quality = options?.quality ?? 75
  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
  })

  return `/_next/image?${params.toString()}`
}

export function pickDeterministicMediaUrl(
  pool: Array<string | null | undefined> | null | undefined,
  seed: string | number,
  fallback?: string | null
) {
  const items = (pool ?? []).map((item) => item?.trim()).filter(Boolean) as string[]
  if (items.length === 0) return fallback || null

  const hashSource = String(seed)
  let hash = 0

  for (let index = 0; index < hashSource.length; index += 1) {
    hash = (hash << 5) - hash + hashSource.charCodeAt(index)
    hash |= 0
  }

  const target = items[Math.abs(hash) % items.length]
  return target || fallback || null
}
