import fs from 'node:fs'
import path from 'node:path'
import { query } from '../lib/db'
import { SETTINGS_KEYS } from '../lib/constants/settings'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function normalizeSiteUrl(input: string) {
  const url = new URL(input.trim())
  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))
  loadEnv(path.join(process.cwd(), '.env'))
  loadEnv(path.join(process.cwd(), '.env.production'))

  const nextUrl = process.argv[2]
  if (!nextUrl) {
    throw new Error('Usage: npm run site:set-url -- <https://example.com>')
  }

  const siteUrl = normalizeSiteUrl(nextUrl)
  const currentProfileResult = await query<{ value: Record<string, unknown> }>(
    'SELECT value FROM settings WHERE key = $1',
    [SETTINGS_KEYS.SITE_PROFILE]
  )
  const currentProfile = currentProfileResult.rows[0]?.value ?? {}

  await query(
    `INSERT INTO settings (key, value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = $2::jsonb, description = EXCLUDED.description, updated_at = NOW()`,
    [
      SETTINGS_KEYS.SITE_PROFILE,
      JSON.stringify({
        ...currentProfile,
        siteUrl,
      }),
      'Site profile configuration',
    ]
  )

  console.log(`[site] Updated site.profile.siteUrl to ${siteUrl}`)
}

main().catch((error) => {
  console.error('[site] Failed:', error)
  process.exit(1)
})
