interface WindChimeProps {
  id: string
  side: 'left' | 'right'
}

function WindChime({ id, side }: WindChimeProps) {
  const jadeId = `${id}-jade`
  const paperId = `${id}-paper`
  const shadowId = `${id}-shadow`

  return (
    <svg
      viewBox="0 76 120 209"
      role="presentation"
      className={`hero-wind-chime h-auto w-full ${side === 'right' ? 'hero-wind-chime-right' : ''}`}
    >
      <defs>
        <linearGradient id={jadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7f0d9" />
          <stop offset="0.48" stopColor="#71b6a0" />
          <stop offset="1" stopColor="#2e6d65" />
        </linearGradient>
        <linearGradient id={paperId} x1="0" y1="0" x2="1" y2="0.9">
          <stop offset="0" stopColor="#fff7db" />
          <stop offset="0.55" stopColor="#e8d5a8" />
          <stop offset="1" stopColor="#b9935c" />
        </linearGradient>
        <filter id={shadowId} x="-50%" y="-30%" width="200%" height="190%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="5"
            floodColor="#071313"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <g
          className="hero-wind-chime-dangles"
          fill="none"
          strokeLinecap="round"
        >
          <g data-wind-chime-talisman>
            <path d="M60 78v11" stroke="#8c682f" strokeWidth="1.5" />
            <circle cx="60" cy="88" r="2" fill="#d1a85f" />
            <path
              d="M43 90h34v63l-5 6-6-3-6 5-6-5-6 3-5-6Z"
              fill={`url(#${paperId})`}
              stroke="#8e3f32"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path d="M47 95h26v8H47Z" fill="#a54537" opacity="0.88" />
            <path
              d="M50 108c6 4 14 4 20 0m-20 36c6-4 14-4 20 0M51 111l-3 6 5 5-4 7 5 6m15-24 3 6-5 5 4 7-5 6"
              stroke="#a54537"
              strokeWidth="1.15"
              opacity="0.78"
            />
            <circle cx="60" cy="99" r="2.2" fill="#e8c884" />
            <text
              x="60"
              y="124"
              fill="#9f3f36"
              fontFamily="serif"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              <tspan x="60">快</tspan>
              <tspan x="60" dy="15">
                气
              </tspan>
            </text>
          </g>

          <path d="M60 161v33" stroke="#89612d" strokeWidth="1.8" />
          <circle
            cx="60"
            cy="207"
            r="13"
            fill={`url(#${jadeId})`}
            stroke="#d9c37d"
            strokeWidth="1.8"
          />
          <circle cx="60" cy="207" r="4.5" fill="#183f3b" opacity="0.8" />
          <path d="M60 220v17" stroke="#7f342f" strokeWidth="2.2" />
          <path
            d="m60 230 9 10-9 11-9-11Z"
            fill="#a9413b"
            stroke="#e08a67"
            strokeWidth="1.2"
          />
          <path
            d="M55 250c-1 12-3 22-6 31M60 251v32M65 250c1 12 3 22 6 31"
            stroke="#b64a42"
            strokeWidth="2.5"
          />
          <path
            d="M51 280h-5M58 283h4M69 280h5"
            stroke="#e08a6f"
            strokeWidth="2"
          />
        </g>
      </g>
    </svg>
  )
}

export function HeroWindChimes() {
  return (
    <div
      aria-hidden
      data-navbar-wind-chimes
      className="pointer-events-none absolute inset-x-0 top-full z-[-1] hidden h-56 md:block"
    >
      <div className="absolute left-0 top-0 w-[clamp(3.75rem,4.6vw,5.25rem)] -translate-x-[82%]">
        <WindChime id="hero-wind-chime-left" side="left" />
      </div>
      <div className="absolute right-0 top-0 w-[clamp(3.75rem,4.6vw,5.25rem)] translate-x-[82%]">
        <WindChime id="hero-wind-chime-right" side="right" />
      </div>
    </div>
  )
}
