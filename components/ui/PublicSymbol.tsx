import type { RemixiconComponentType } from '@remixicon/react'
import {
  RiApps2Line,
  RiArchiveLine,
  RiArticleLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiBookOpenLine,
  RiCameraLine,
  RiChat3Line,
  RiCloseLine,
  RiCodeBoxLine,
  RiExternalLinkLine,
  RiFlashlightLine,
  RiFolderLine,
  RiGamepadLine,
  RiHome5Line,
  RiLink,
  RiMailLine,
  RiMenuLine,
  RiMoonLine,
  RiPencilLine,
  RiPriceTagLine,
  RiRssLine,
  RiStarLine,
  RiSunLine,
  RiTerminalBoxLine,
  RiTimeLine,
  RiToolsLine,
  RiUserLine,
  RiMovieLine,
} from '@remixicon/react'

interface PublicSymbolProps {
  icon: string
  className?: string
  size?: number
  'aria-label'?: string
  'aria-hidden'?: boolean
}

const ICON_MAP: Record<string, RemixiconComponentType> = {
  add_link: RiLink,
  arrow_forward: RiArrowRightLine,
  arrow_outward: RiExternalLinkLine,
  arrow_upward: RiArrowUpLine,
  article: RiArticleLine,
  bolt: RiFlashlightLine,
  chat_bubble: RiChat3Line,
  close: RiCloseLine,
  code: RiCodeBoxLine,
  construction: RiToolsLine,
  dark_mode: RiMoonLine,
  deployed_code: RiTerminalBoxLine,
  edit_note: RiPencilLine,
  folder: RiFolderLine,
  home: RiHome5Line,
  inventory_2: RiArchiveLine,
  light_mode: RiSunLine,
  link: RiLink,
  mail: RiMailLine,
  menu: RiMenuLine,
  menu_book: RiBookOpenLine,
  movie: RiMovieLine,
  open_in_new: RiExternalLinkLine,
  person: RiUserLine,
  photo_camera: RiCameraLine,
  rss_feed: RiRssLine,
  schedule: RiTimeLine,
  sell: RiPriceTagLine,
  sports_esports: RiGamepadLine,
  star: RiStarLine,
  widgets: RiApps2Line,
}

export function PublicSymbol({
  icon,
  className = '',
  size = 20,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: PublicSymbolProps) {
  const IconComponent = ICON_MAP[icon] ?? RiApps2Line

  return (
    <IconComponent
      size={size}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  )
}
