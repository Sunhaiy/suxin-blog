import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findLinkSubmissions, insertLinkSubmission } from '@/lib/db/dao/linkSubmissionDao'

function isAbsoluteUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function isUploadOrAbsoluteUrl(value: string) {
  if (value.startsWith('/')) return true
  return isAbsoluteUrl(value)
}

const createSchema = z.object({
  siteName: z.string().trim().min(1).max(100),
  siteUrl: z.string().trim().url(),
  siteDescription: z.string().trim().max(400).optional(),
  siteAvatarUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid avatar URL')
    .optional(),
  siteRssUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value) || isAbsoluteUrl(value), 'Invalid RSS URL')
    .optional(),
  contactEmail: z.string().trim().email(),
  contactNote: z.string().trim().max(500).optional(),
})

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submissions = await findLinkSubmissions()
  return NextResponse.json(submissions)
}

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const submission = await insertLinkSubmission(parsed.data)
  return NextResponse.json(submission, { status: 201 })
}
