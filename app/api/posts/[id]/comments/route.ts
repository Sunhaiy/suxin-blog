import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import {
  findApprovedComments,
  findCommentById,
  insertComment,
} from '@/lib/db/dao/commentDao'
import { findPostById } from '@/lib/db/dao/postDao'
import { getSiteProfile } from '@/lib/site'

const submitSchema = z.object({
  author_name: z.string().trim().min(1).max(50),
  author_email: z.string().email().optional().or(z.literal('')),
  parent_id: z.number().int().positive().nullable().optional(),
  content: z.string().trim().min(1).max(2000),
})

function buildLocationLabel(req: NextRequest) {
  const city = req.headers.get('x-vercel-ip-city')
  const region = req.headers.get('x-vercel-ip-country-region')
  const country = req.headers.get('x-vercel-ip-country')
  const values = [region, city].filter(Boolean)

  if (values.length > 0) return values.join(' · ')
  return country || null
}

function parseBrowserLabel(userAgent: string | null) {
  if (!userAgent) return null
  const patterns = [
    { name: 'Microsoft Edge', regex: /Edg\/([\d.]+)/ },
    { name: 'Chrome', regex: /Chrome\/([\d.]+)/ },
    { name: 'Firefox', regex: /Firefox\/([\d.]+)/ },
    { name: 'Safari', regex: /Version\/([\d.]+).*Safari/ },
    { name: 'Opera', regex: /OPR\/([\d.]+)/ },
  ]

  for (const item of patterns) {
    const match = userAgent.match(item.regex)
    if (match) return `${item.name} ${match[1]}`
  }

  return null
}

function parseOsLabel(userAgent: string | null) {
  if (!userAgent) return null

  if (/Windows NT 10\.0/.test(userAgent)) return 'Windows 10/11'
  if (/Windows NT 6\.3/.test(userAgent)) return 'Windows 8.1'
  if (/Mac OS X ([\d_]+)/.test(userAgent)) {
    const version = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.')
    return version ? `macOS ${version}` : 'macOS'
  }
  if (/Android ([\d.]+)/.test(userAgent)) {
    const version = userAgent.match(/Android ([\d.]+)/)?.[1]
    return version ? `Android ${version}` : 'Android'
  }
  if (/(iPhone|iPad|iPod).*OS ([\d_]+)/.test(userAgent)) {
    const version = userAgent.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.')
    return version ? `iOS ${version}` : 'iOS'
  }
  if (/Linux/.test(userAgent)) return 'Linux'

  return null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const postId = Number(id)
  if (Number.isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  try {
    const comments = await findApprovedComments(postId)
    return NextResponse.json(comments)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const postId = Number(id)

  if (Number.isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  const post = await findPostById(postId)
  if (!post || post.status !== 'published') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const parentId = parsed.data.parent_id ?? null
  if (parentId) {
    const parent = await findCommentById(parentId)
    if (!parent || parent.post_id !== postId) {
      return NextResponse.json({ error: 'Invalid reply target' }, { status: 400 })
    }
  }

  try {
    const [isByAuthor, siteProfile] = await Promise.all([isAdmin(req), getSiteProfile()])
    const userAgent = req.headers.get('user-agent')

    const comment = await insertComment({
      post_id: postId,
      author_name: isByAuthor ? siteProfile.ownerName : parsed.data.author_name,
      author_email: isByAuthor ? siteProfile.email : parsed.data.author_email || null,
      parent_id: parentId,
      content: parsed.data.content,
      location_label: buildLocationLabel(req),
      browser_label: parseBrowserLabel(userAgent),
      os_label: parseOsLabel(userAgent),
      is_by_author: isByAuthor,
      is_approved: isByAuthor,
    })

    return NextResponse.json(
      {
        message: isByAuthor ? '回复已发布。' : '评论已提交，审核后会显示在文章下方。',
        comment,
        approved: isByAuthor,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
