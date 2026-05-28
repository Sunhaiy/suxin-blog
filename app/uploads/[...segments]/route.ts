import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

function getUploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), 'public', 'uploads')
}

function resolveUploadPath(segments: string[]) {
  const safeSegments = segments.filter(Boolean)
  const uploadDir = getUploadDir()
  const targetPath = path.resolve(uploadDir, ...safeSegments)

  if (targetPath === uploadDir || !targetPath.startsWith(`${uploadDir}${path.sep}`)) {
    return null
  }

  return targetPath
}

function getMimeType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

type RangeInfo =
  | { start: number; end: number; size: number; status: 206; contentRange: string }
  | { start: 0; end: number; size: number; status: 200; contentRange: null }

function parseRangeHeader(rangeHeader: string | null, size: number): RangeInfo | null {
  if (!rangeHeader) {
    return { start: 0, end: size - 1, size, status: 200, contentRange: null }
  }

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/i)
  if (!match) return null

  const [, rawStart, rawEnd] = match
  let start = rawStart ? Number.parseInt(rawStart, 10) : NaN
  let end = rawEnd ? Number.parseInt(rawEnd, 10) : NaN

  if (Number.isNaN(start) && Number.isNaN(end)) return null

  if (Number.isNaN(start)) {
    const suffixLength = end
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    if (!Number.isFinite(start) || start < 0 || start >= size) return null
    if (Number.isNaN(end) || end >= size) end = size - 1
    if (end < start) return null
  }

  return {
    start,
    end,
    size: end - start + 1,
    status: 206,
    contentRange: `bytes ${start}-${end}/${size}`,
  }
}

async function serveUpload(request: Request, segments: string[]) {
  const filePath = resolveUploadPath(segments)
  if (!filePath) return new Response('Invalid upload path', { status: 400 })

  try {
    const stats = await fs.promises.stat(filePath)
    if (!stats.isFile()) return new Response('Not found', { status: 404 })

    const range = parseRangeHeader(request.headers.get('range'), stats.size)
    if (!range) {
      return new Response('Requested range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${stats.size}`,
        },
      })
    }

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(range.size),
      'Content-Type': getMimeType(filePath),
      'Last-Modified': stats.mtime.toUTCString(),
    })

    if (range.contentRange) {
      headers.set('Content-Range', range.contentRange)
    }

    if (request.method === 'HEAD') {
      return new Response(null, { status: range.status, headers })
    }

    const stream = fs.createReadStream(filePath, {
      start: range.start,
      end: range.end,
    })

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: range.status,
      headers,
    })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return new Response('Not found', { status: 404 })
    console.error('[uploads.route]', error)
    return new Response('Failed to read upload', { status: 500 })
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await context.params
  return serveUpload(request, segments)
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await context.params
  return serveUpload(request, segments)
}
