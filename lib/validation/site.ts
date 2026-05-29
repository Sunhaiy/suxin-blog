import { z } from 'zod'

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

const emailSchema = z.string().email()

const aboutStrengthSchema = z.object({
  icon: z.string().trim().max(40).default('star'),
  title: z.string().trim().max(80).default(''),
  lines: z.array(z.string().trim().max(80)).max(4).default([]),
})

const aboutLifestyleItemSchema = z.object({
  id: z.string().trim().max(48).default(''),
  icon: z.string().trim().max(40).default('star'),
  label: z.string().trim().max(80).default(''),
  title: z.string().trim().max(180).default(''),
  eyebrow: z.string().trim().max(80).default(''),
  description: z.string().trim().max(420).default(''),
  mediaType: z.enum(['image', 'video']).default('image'),
  mediaUrl: z
    .string()
    .trim()
    .max(260)
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid lifestyle media URL')
    .default(''),
  posterUrl: z
    .string()
    .trim()
    .max(260)
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid lifestyle poster URL')
    .nullable()
    .default(null),
})

const siteQuoteSchema = z.object({
  id: z.string().trim().max(48).default(''),
  text: z.string().trim().max(240).default(''),
  from: z.string().trim().max(80).default(''),
})

const homeProfileLinkSchema = z.object({
  id: z.string().trim().max(48).default(''),
  label: z.string().trim().max(40).default(''),
  href: z
    .string()
    .trim()
    .refine(
      (value) =>
        !value ||
        value.startsWith('/') ||
        value.startsWith('mailto:') ||
        value.startsWith('#') ||
        isAbsoluteUrl(value),
      'Invalid home profile link URL'
    )
    .default(''),
  icon: z.string().trim().max(40).default('star'),
})

export const siteProfileSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  siteNameEn: z.string().trim().max(120).default(''),
  ownerName: z.string().trim().min(1).max(80),
  ownerInitial: z.string().trim().max(8).default(''),
  themeColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Invalid theme color')
    .default('#10b981'),
  slogan: z.string().trim().max(120).default(''),
  roleLine: z.string().trim().max(120).default(''),
  bio: z.string().trim().max(400).default(''),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid avatar URL')
    .nullable()
    .optional(),
  defaultPostCoverUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid default post cover URL')
    .nullable()
    .optional(),
  postCoverPoolUrls: z
    .array(
      z
        .string()
        .trim()
        .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid post cover pool URL')
    )
    .max(48)
    .default([]),
  homeGreetingPool: z.array(z.string().trim().max(80)).max(16).default([]),
  homeQuotePool: z.array(siteQuoteSchema).max(24).default([]),
  homeProfileLinks: z.array(homeProfileLinkSchema).max(8).default([]),
  gamesHeroImageUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid games hero image URL')
    .nullable()
    .optional(),
  siteUrl: z
    .string()
    .trim()
    .refine((value) => !value || isAbsoluteUrl(value), 'Invalid site URL')
    .default(''),
  rssUrl: z
    .string()
    .trim()
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid RSS URL')
    .default(''),
  friendLinkIntro: z.string().trim().max(260).default(''),
  friendLinkRequirements: z.string().trim().max(1000).default(''),
  githubUrl: z
    .string()
    .trim()
    .refine((value) => !value || isAbsoluteUrl(value), 'Invalid GitHub URL')
    .default(''),
  email: z
    .string()
    .trim()
    .refine((value) => !value || emailSchema.safeParse(value).success, 'Invalid email')
    .default(''),
  footerText: z.string().trim().max(140).default(''),
  footerIcpNumber: z.string().trim().max(80).default(''),
  footerIcpUrl: z
    .string()
    .trim()
    .refine((value) => !value || isAbsoluteUrl(value), 'Invalid ICP URL')
    .default(''),
  footerPoliceNumber: z.string().trim().max(80).default(''),
  footerPoliceUrl: z
    .string()
    .trim()
    .refine((value) => !value || isAbsoluteUrl(value), 'Invalid police filing URL')
    .default(''),
  aboutHeroName: z.string().trim().max(80).default(''),
  aboutHeroNameEn: z.string().trim().max(120).default(''),
  aboutHeroRoleLine: z.string().trim().max(160).default(''),
  aboutHeroBio: z.string().trim().max(620).default(''),
  aboutHeroPortraitUrl: z
    .string()
    .trim()
    .max(260)
    .refine((value) => !value || isUploadOrAbsoluteUrl(value), 'Invalid about portrait URL')
    .nullable()
    .optional(),
  aboutNameplateLogoTop: z.string().trim().max(10).default(''),
  aboutNameplateLogoBottom: z.string().trim().max(10).default(''),
  aboutNameplateTitle: z.string().trim().max(140).default(''),
  aboutNameplateSubtitle: z.string().trim().max(140).default(''),
  aboutNameplateEnglish: z.string().trim().max(180).default(''),
  aboutClosingTitle: z.string().trim().max(180).default(''),
  aboutClosingDescription: z.string().trim().max(180).default(''),
  aboutContactEmail: z
    .string()
    .trim()
    .refine((value) => !value || emailSchema.safeParse(value).success, 'Invalid about contact email')
    .default(''),
  aboutStrengths: z.array(aboutStrengthSchema).max(8).default([]),
  aboutFeaturedWorkIds: z.array(z.coerce.number().int().positive()).max(4).default([]),
  aboutLifestyleItems: z.array(aboutLifestyleItemSchema).max(8).default([]),
})
