import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { getSiteProfile, normalizeSiteProfile, persistSiteProfile } from '@/lib/site'
import { siteProfileSchema } from '@/lib/validation/site'

export async function GET() {
  const profile = await getSiteProfile()
  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = siteProfileSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const profile = await persistSiteProfile(
    normalizeSiteProfile({
      ...parsed.data,
      avatarUrl: parsed.data.avatarUrl || null,
      defaultPostCoverUrl: parsed.data.defaultPostCoverUrl || null,
      gamesHeroImageUrl: parsed.data.gamesHeroImageUrl || null,
      themeColor: parsed.data.themeColor || '#10b981',
    })
  )

  return NextResponse.json(profile)
}
