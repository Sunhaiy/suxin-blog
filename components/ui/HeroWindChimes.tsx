interface WindChimeProps {
  id: string
  side: 'left' | 'right'
}

function WindChime({ id, side }: WindChimeProps) {
  const bronzeId = `${id}-bronze`
  const patinaId = `${id}-patina`
  const jadeId = `${id}-jade`
  const shadowId = `${id}-shadow`

  return (
    <svg
      viewBox="0 0 120 285"
      role="presentation"
      className={`hero-wind-chime h-auto w-full ${side === 'right' ? 'hero-wind-chime-right' : ''}`}
    >
      <defs>
        <linearGradient id={bronzeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d899" />
          <stop offset="0.36" stopColor="#b87b35" />
          <stop offset="0.72" stopColor="#76502b" />
          <stop offset="1" stopColor="#352a20" />
        </linearGradient>
        <linearGradient id={patinaId} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#70958a" />
          <stop offset="0.48" stopColor="#315d58" />
          <stop offset="1" stopColor="#172f31" />
        </linearGradient>
        <linearGradient id={jadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7f0d9" />
          <stop offset="0.48" stopColor="#71b6a0" />
          <stop offset="1" stopColor="#2e6d65" />
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-30%" width="200%" height="190%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#071313" floodOpacity="0.5" />
        </filter>
      </defs>

      <g fill="none" strokeLinecap="round">
        <path d="M60 0v31" stroke="#172c2b" strokeWidth="2.8" opacity="0.95" />
        <path d="M57.5 0v31" stroke="#d2b36c" strokeWidth="0.7" opacity="0.7" />
        <circle cx="60" cy="34" r="5" stroke="#b7833e" strokeWidth="2.4" />
        <path d="M60 39v9" stroke="#5d4529" strokeWidth="2.4" />
      </g>

      <g filter={`url(#${shadowId})`}>
        <path
          d="M18 75c8-2 15-8 20-17 6-10 13-16 22-20 9 4 16 10 22 20 5 9 12 15 20 17-9 4-18 5-27 3H45c-9 2-18 1-27-3Z"
          fill={`url(#${patinaId})`}
          stroke="#d0a85b"
          strokeWidth="2.2"
        />
        <path d="M17 75c5 2 10 2 15-1M103 75c-5 2-10 2-15-1" fill="none" stroke="#e0bd72" strokeWidth="2" />
        <path d="M35 62h50M43 51l6 27M77 51l-6 27M60 39v39" fill="none" stroke="#bb8c45" strokeWidth="1.3" opacity="0.86" />
        <path d="m51 64 9-9 9 9-9 9Z" fill="#ba8a47" opacity="0.72" />
        <path d="m56 64 4-4 4 4-4 4Z" fill="#dce8c9" opacity="0.9" />

        <g className="hero-wind-chime-dangles" fill="none" strokeLinecap="round">
          <path d="M28 78v35M44 78v50M60 78v39M76 78v50M92 78v35" stroke="#8c682f" strokeWidth="1.5" />

          <g fill={`url(#${bronzeId})`} stroke="#443221" strokeWidth="1.4">
            <path d="M20 124c2-8 5-12 8-12s6 4 8 12l4 7H16Z" />
            <path d="M35 141c2-9 5-14 9-14s7 5 9 14l4 8H31Z" />
            <path d="M49 133c2-11 6-17 11-17s9 6 11 17l5 10H44Z" />
            <path d="M67 141c2-9 5-14 9-14s7 5 9 14l4 8H63Z" />
            <path d="M84 124c2-8 5-12 8-12s6 4 8 12l4 7H80Z" />
          </g>

          <path d="M16 131h24M31 149h26M44 143h32M63 149h26M80 131h24" stroke="#e0bd73" strokeWidth="1.5" />
          <path d="M28 131v8M44 149v8M60 143v12M76 149v8M92 131v8" stroke="#5a3e22" strokeWidth="1.3" />
          <circle cx="28" cy="141" r="2.5" fill="#d5aa5d" />
          <circle cx="44" cy="159" r="2.5" fill="#d5aa5d" />
          <circle cx="60" cy="158" r="3" fill="#e3bd6d" />
          <circle cx="76" cy="159" r="2.5" fill="#d5aa5d" />
          <circle cx="92" cy="141" r="2.5" fill="#d5aa5d" />

          <path d="M60 160v34" stroke="#89612d" strokeWidth="1.8" />
          <circle cx="60" cy="207" r="13" fill={`url(#${jadeId})`} stroke="#d9c37d" strokeWidth="1.8" />
          <circle cx="60" cy="207" r="4.5" fill="#183f3b" opacity="0.8" />
          <path d="M60 220v17" stroke="#7f342f" strokeWidth="2.2" />
          <path d="m60 230 9 10-9 11-9-11Z" fill="#a9413b" stroke="#e08a67" strokeWidth="1.2" />
          <path d="M55 250c-1 12-3 22-6 31M60 251v32M65 250c1 12 3 22 6 31" stroke="#b64a42" strokeWidth="2.5" />
          <path d="M51 280h-5M58 283h4M69 280h5" stroke="#e08a6f" strokeWidth="2" />
        </g>
      </g>
    </svg>
  )
}

export function HeroWindChimes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] hidden md:block">
      <div className="absolute left-[clamp(2.5rem,7vw,8.5rem)] top-12 w-[clamp(4.75rem,5.6vw,7rem)]">
        <WindChime id="hero-wind-chime-left" side="left" />
      </div>
      <div className="absolute right-[clamp(2.5rem,7vw,8.5rem)] top-10 w-[clamp(4.75rem,5.6vw,7rem)]">
        <WindChime id="hero-wind-chime-right" side="right" />
      </div>
    </div>
  )
}
