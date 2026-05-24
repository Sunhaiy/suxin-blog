'use client'

import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { ActivityDay } from '@/lib/db/dao/activityDao'

const COLUMN_WIDTH = 14
const GRID_MIN_WIDTH = 728

const LEVEL_STYLES: CSSProperties[] = [
  { backgroundColor: 'hsl(var(--border) / 0.5)' },
  { backgroundColor: 'hsl(var(--primary) / 0.28)' },
  { backgroundColor: 'hsl(var(--primary) / 0.46)' },
  { backgroundColor: 'hsl(var(--primary) / 0.68)' },
  { backgroundColor: 'hsl(var(--primary))' },
]

type TooltipState = {
  left: number
  top: number
  text: string
}

type Cell = {
  date: string
  count: number
  future: boolean
}

function getLevel(count: number) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

interface Props {
  data: ActivityDay[]
}

export function ActivityHeatmap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { weeks, monthLabels, activeDays, total } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dayOfWeek = today.getDay()
    const thisMonday = new Date(today)
    thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    const start = new Date(thisMonday)
    start.setDate(start.getDate() - 51 * 7)

    const countMap = new Map(data.map((item) => [item.date, item.count]))
    const nextWeeks: Cell[][] = []
    const nextMonthLabels: { label: string; col: number }[] = []
    let lastMonth = -1
    let nextActiveDays = 0
    let nextTotal = 0

    for (let col = 0; col < 52; col += 1) {
      const week: Cell[] = []

      for (let row = 0; row < 7; row += 1) {
        const date = new Date(start)
        date.setDate(date.getDate() + col * 7 + row)

        const dateKey = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-')

        const future = date > today
        const count = future ? 0 : (countMap.get(dateKey) ?? 0)

        if (row === 0 && date.getMonth() !== lastMonth) {
          nextMonthLabels.push({ label: `${date.getMonth() + 1}月`, col })
          lastMonth = date.getMonth()
        }

        if (!future && count > 0) {
          nextActiveDays += 1
          nextTotal += count
        }

        week.push({ date: dateKey, count, future })
      }

      nextWeeks.push(week)
    }

    return {
      weeks: nextWeeks,
      monthLabels: nextMonthLabels,
      activeDays: nextActiveDays,
      total: nextTotal,
    }
  }, [data])

  function showTooltip(event: MouseEvent<HTMLDivElement>, cell: Cell) {
    if (cell.future || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const cellRect = event.currentTarget.getBoundingClientRect()
    const rawLeft = cellRect.left - containerRect.left + cellRect.width / 2
    const safePadding = 68
    const clampedLeft = Math.max(
      safePadding,
      Math.min(containerRect.width - safePadding, rawLeft)
    )

    setTooltip({
      left: clampedLeft,
      top: cellRect.top - containerRect.top - 10,
      text:
        cell.count > 0
          ? `${formatDate(cell.date)} · ${cell.count} 条`
          : formatDate(cell.date),
    })
  }

  return (
    <div className="relative max-w-full overflow-hidden">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">创作活跃度</h2>
        <p className="text-sm text-muted-foreground">
          过去一年 · <span className="font-medium text-foreground">{total}</span> 条 ·{' '}
          <span className="font-medium text-foreground">{activeDays}</span> 天活跃
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative max-w-full overflow-x-auto overflow-y-visible pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className="inline-flex min-w-full flex-col"
          style={{ minWidth: `${GRID_MIN_WIDTH}px` }}
        >
          <div className="relative h-[14px]">
            {monthLabels.map(({ label, col }) => (
              <span
                key={`${label}-${col}`}
                className="absolute whitespace-nowrap text-[9px] text-muted-foreground"
                style={{ left: col * COLUMN_WIDTH }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-[3px] flex gap-[3px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((cell, dayIndex) => (
                  <div
                    key={`${cell.date}-${dayIndex}`}
                    className="h-[11px] w-[11px] cursor-default rounded-[2px] transition-transform duration-150 hover:scale-[1.18]"
                    style={
                      cell.future
                        ? { backgroundColor: 'hsl(var(--border) / 0.2)' }
                        : LEVEL_STYLES[getLevel(cell.count)]
                    }
                    onMouseEnter={(event) => showTooltip(event, cell)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-muted-foreground">少</span>
            {LEVEL_STYLES.map((style, index) => (
              <div key={index} className="h-[10px] w-[10px] rounded-[2px]" style={style} />
            ))}
            <span className="text-[10px] text-muted-foreground">多</span>
          </div>
        </div>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-border/80 bg-background/88 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-xl"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            {tooltip.text}
          </div>
        ) : null}
      </div>
    </div>
  )
}
