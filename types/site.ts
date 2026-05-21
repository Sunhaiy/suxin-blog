export interface AboutStrengthItem {
  icon: string
  title: string
  lines: string[]
}

export interface SiteQuoteItem {
  id: string
  text: string
  from: string
}

export interface HomeProfileLinkItem {
  id: string
  label: string
  href: string
  icon: string
}

export type AboutLifestyleMediaType = 'image' | 'video'

export interface AboutLifestyleItem {
  id: string
  icon: string
  label: string
  title: string
  eyebrow: string
  description: string
  mediaType: AboutLifestyleMediaType
  mediaUrl: string
  posterUrl: string | null
}

export interface SiteProfile {
  siteName: string
  siteNameEn: string
  ownerName: string
  ownerInitial: string
  themeColor: string
  slogan: string
  roleLine: string
  bio: string
  avatarUrl: string | null
  defaultPostCoverUrl: string | null
  postCoverPoolUrls: string[]
  homeGreetingPool: string[]
  homeQuotePool: SiteQuoteItem[]
  homeProfileLinks: HomeProfileLinkItem[]
  gamesHeroImageUrl: string | null
  siteUrl: string
  rssUrl: string
  friendLinkIntro: string
  friendLinkRequirements: string
  githubUrl: string
  email: string
  footerText: string
  footerIcpNumber: string
  footerIcpUrl: string
  footerPoliceNumber: string
  footerPoliceUrl: string
  aboutHeroName: string
  aboutHeroNameEn: string
  aboutHeroRoleLine: string
  aboutHeroBio: string
  aboutNameplateLogoTop: string
  aboutNameplateLogoBottom: string
  aboutNameplateTitle: string
  aboutNameplateSubtitle: string
  aboutNameplateEnglish: string
  aboutClosingTitle: string
  aboutClosingDescription: string
  aboutContactEmail: string
  aboutStrengths: AboutStrengthItem[]
  aboutFeaturedWorkIds: number[]
  aboutLifestyleItems: AboutLifestyleItem[]
}
