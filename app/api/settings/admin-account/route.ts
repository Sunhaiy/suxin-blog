import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { getAdminCredentialsProfile, saveAdminCredentials } from '@/lib/auth/adminCredentials'

const updateAdminAccountSchema = z
  .object({
    email: z.string().email('请输入有效邮箱地址'),
    currentPassword: z.string().min(6, '请输入当前密码'),
    newPassword: z
      .string()
      .trim()
      .max(128, '新密码不能超过 128 个字符')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    const nextPassword = value.newPassword?.trim()
    if (nextPassword && nextPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: '新密码至少 8 位',
      })
    }
  })

function readApiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getAdminCredentialsProfile()
  if (!profile) {
    return NextResponse.json({ error: '管理员凭据未配置' }, { status: 500 })
  }

  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = updateAdminAccountSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const next = await saveAdminCredentials({
      email: parsed.data.email,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword?.trim() || null,
    })

    return NextResponse.json(next)
  } catch (error) {
    return NextResponse.json(
      { error: readApiError(error, '保存管理员账号失败') },
      { status: 400 }
    )
  }
}
