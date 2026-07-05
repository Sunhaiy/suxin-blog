interface CommentAvatarProps {
  name: string
  className?: string
}

const palettes = [
  { background: '#E9E6DF', hair: '#3F4B4F', accent: '#849497', skin: '#F0C9AB' },
  { background: '#E8E1D8', hair: '#54443D', accent: '#A8846B', skin: '#EFC5A8' },
  { background: '#DEE7E1', hair: '#3E5048', accent: '#789184', skin: '#EDC4A5' },
  { background: '#E9DFE1', hair: '#57434B', accent: '#A57C87', skin: '#EFC3A6' },
  { background: '#DFE5EB', hair: '#3D4A5A', accent: '#788DA8', skin: '#EEC6AA' },
  { background: '#E5E1EA', hair: '#4B4357', accent: '#8D7DA4', skin: '#EEC4A8' },
]

function hashName(name: string) {
  let hash = 2166136261
  for (const character of name.trim() || 'guest') {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

export function CommentAvatar({ name, className = '' }: CommentAvatarProps) {
  const variant = hashName(name) % palettes.length
  const palette = palettes[variant]

  return (
    <span
      role="img"
      aria-label={`${name || '访客'}的默认头像`}
      className={`inline-flex shrink-0 overflow-hidden rounded-full border border-black/10 ${className}`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
        <rect width="64" height="64" rx="32" fill={palette.background} />
        <circle cx="32" cy="35" r="15" fill={palette.skin} />
        {variant === 0 ? (
          <>
            <path d="M15 33c0-14 7-22 18-22 10 0 17 7 17 20-5-1-9-5-11-10-5 7-13 10-24 12Z" fill={palette.hair} />
            <path d="M16 29c-2 7 0 14 4 18l4-11-8-7ZM49 28c3 7 1 15-3 19l-3-12 6-7Z" fill={palette.hair} />
          </>
        ) : variant === 1 ? (
          <>
            <path d="M14 34c0-15 7-23 19-23 12 0 18 9 17 24-5-10-11-14-19-14-6 0-12 4-17 13Z" fill={palette.hair} />
            <circle cx="17" cy="35" r="5" fill={palette.hair} />
            <circle cx="48" cy="35" r="5" fill={palette.hair} />
          </>
        ) : variant === 2 ? (
          <>
            <path d="M14 33c1-15 8-22 19-22 11 0 17 8 17 22-4-6-7-11-8-16-5 6-13 10-28 16Z" fill={palette.hair} />
            <path d="M18 28c-4 8-1 17 5 21V34l-5-6Z" fill={palette.hair} />
          </>
        ) : variant === 3 ? (
          <>
            <path d="M14 34c0-15 7-23 18-23 12 0 19 9 18 24-6-2-11-6-14-13-5 6-12 10-22 12Z" fill={palette.hair} />
            <path d="M17 22c3-9 11-13 20-11-2 5-8 9-20 11Z" fill={palette.accent} />
          </>
        ) : variant === 4 ? (
          <>
            <path d="M14 34c0-15 7-23 19-23 11 0 18 8 17 23-6-7-13-11-22-11-5 0-10 4-14 11Z" fill={palette.hair} />
            <path d="M22 14c4-5 11-6 16-2l-6 5-10-3Z" fill={palette.accent} />
          </>
        ) : (
          <>
            <path d="M14 34c0-15 7-23 18-23 12 0 19 9 18 24-4-2-8-7-10-13-6 7-14 11-26 12Z" fill={palette.hair} />
            <path d="M17 26c-3 8 0 17 6 21V32l-6-6ZM47 25c4 8 1 17-5 22V32l5-7Z" fill={palette.hair} />
          </>
        )}
        <circle cx="27" cy="35" r="1.35" fill="#343434" />
        <circle cx="37" cy="35" r="1.35" fill="#343434" />
        <path d="M28.5 41c2.4 1.8 4.6 1.8 7 0" fill="none" stroke="#A86F67" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M13 64c1-12 8-18 19-18s18 6 19 18H13Z" fill={palette.accent} />
        <path d="M25 48l7 7 7-7" fill="none" stroke="rgba(255,255,255,.64)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
