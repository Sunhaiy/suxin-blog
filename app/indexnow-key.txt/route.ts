import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const key = process.env.INDEXNOW_KEY?.trim()

  if (!key) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
