import { z } from 'zod'

function isUrl(value: string | null | undefined) {
  if (!value) return true
  if (value.startsWith('/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const backgroundSceneSchema = z.object({
  image: z.object({
    url: z.string().trim().optional().nullable(),
    position: z.string().trim().min(1).max(80),
    size: z.string().trim().min(1).max(40),
    opacity: z.number().min(0).max(1),
  }),
  weather: z.object({
    preset: z.enum(['none', 'storm']),
    intensity: z.number().min(0).max(1),
  }),
  filter: z.object({
    overlay: z.number().min(0).max(1),
    gradient: z.number().min(0).max(1),
    tintColor: z.string().trim().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/),
    blur: z.number().min(0).max(24),
    noise: z.number().min(0).max(1),
    vignette: z.number().min(0).max(1),
  }),
}).superRefine((value, ctx) => {
  if (!isUrl(value.image.url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'image.url must be a valid URL',
      path: ['image', 'url'],
    })
  }
})
