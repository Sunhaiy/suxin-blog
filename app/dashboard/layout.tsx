// 图标字体已在根布局统一引入（精简 wght 轴 + font-display:block）
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardFrame } from '@/components/admin/DashboardFrame'
import { getSiteProfile } from '@/lib/site'

function hexToHslChannels(hex?: string | null) {
  const clean = (hex || '#10b981').replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, siteProfile] = await Promise.all([auth(), getSiteProfile()])
  if (!session) redirect('/admin/login')

  return (
    <DashboardFrame
      email={session.user?.email}
      themeChannels={hexToHslChannels(siteProfile.themeColor)}
    >
      {children}
    </DashboardFrame>
  )
}
