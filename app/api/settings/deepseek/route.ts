import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { getDeepSeekPublicStatus, type DeepSeekStoredConfig } from '@/lib/ai/deepseek'
import { SETTINGS_KEYS } from '@/lib/constants/settings'
import { deleteSetting, getSetting, setSetting } from '@/lib/db/dao/settingsDao'

const requestSchema = z.object({
  apiKey: z.string().max(400).nullable().optional(),
  baseUrl: z.string().max(240).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  resetToEnv: z.boolean().optional(),
})

function cleanValue(value: string | null | undefined) {
  return value?.trim() || null
}

function normalizeBaseUrl(value: string | null) {
  if (!value) return null
  try {
    const target = new URL(value)
    return target.toString().replace(/\/+$/, '')
  } catch {
    throw new Error('DeepSeek Base URL 格式不正确')
  }
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(await getDeepSeekPublicStatus())
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.resetToEnv) {
    await deleteSetting(SETTINGS_KEYS.DEEPSEEK_CONFIG)
    return NextResponse.json(await getDeepSeekPublicStatus())
  }

  try {
    const current = (await getSetting<DeepSeekStoredConfig>(SETTINGS_KEYS.DEEPSEEK_CONFIG)) ?? {}

    const next: DeepSeekStoredConfig = {
      apiKey:
        parsed.data.apiKey !== undefined ? cleanValue(parsed.data.apiKey) : cleanValue(current.apiKey),
      baseUrl:
        parsed.data.baseUrl !== undefined
          ? normalizeBaseUrl(cleanValue(parsed.data.baseUrl))
          : cleanValue(current.baseUrl),
      model:
        parsed.data.model !== undefined ? cleanValue(parsed.data.model) : cleanValue(current.model),
    }

    if (!next.apiKey && !next.baseUrl && !next.model) {
      await deleteSetting(SETTINGS_KEYS.DEEPSEEK_CONFIG)
    } else {
      await setSetting(
        SETTINGS_KEYS.DEEPSEEK_CONFIG,
        next,
        'DeepSeek API key, base URL and model override'
      )
    }

    return NextResponse.json(await getDeepSeekPublicStatus())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存 DeepSeek 配置失败' },
      { status: 400 }
    )
  }
}
