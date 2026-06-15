import type { ReactNode } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export const ADMIN_PANEL_CLASS =
  'rounded-2xl border border-border/75 bg-card/76 backdrop-blur-xl'

export const ADMIN_MUTED_PANEL_CLASS =
  'rounded-xl border border-border/70 bg-background/36 backdrop-blur-md'

export const ADMIN_INPUT_CLASS =
  'h-11 w-full rounded-lg border border-border/70 bg-background/55 px-4 text-sm text-foreground placeholder:text-muted-foreground/55 transition-colors focus:border-primary/28 focus:outline-none focus:ring-2 focus:ring-primary/14'

export const ADMIN_SELECT_CLASS = ADMIN_INPUT_CLASS

export const ADMIN_TEXTAREA_CLASS =
  'w-full rounded-lg border border-border/70 bg-background/55 px-4 py-3 text-sm leading-6 text-foreground placeholder:text-muted-foreground/55 transition-colors focus:border-primary/28 focus:outline-none focus:ring-2 focus:ring-primary/14'

export const ADMIN_NOTICE_CLASS =
  'rounded-lg border px-4 py-3 text-sm leading-6 backdrop-blur-md'

export function AdminPageHeader({
  eyebrow: _eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  description?: string
  icon?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn(ADMIN_PANEL_CLASS, className)}>
      {(title || description || actions) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function AdminSection({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'grid gap-5 border-b border-border/65 pb-6 last:border-b-0 last:pb-0 lg:grid-cols-[220px_minmax(0,1fr)]',
        className
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {aside ? <div className="mt-3">{aside}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  )
}

export function AdminField({
  label,
  hint,
  children,
  fullWidth = false,
}: {
  label: string
  hint?: string
  children: ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={cn('block space-y-2.5', fullWidth && 'md:col-span-2')}>
      <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <p className="text-xs leading-6 text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function AdminStatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    neutral: 'border-border/70 bg-background/55 text-muted-foreground',
    accent: 'border-primary/24 bg-primary/10 text-primary',
    success: 'border-primary/24 bg-primary/12 text-primary',
    warning: 'border-amber-500/24 bg-amber-500/10 text-amber-300',
    danger: 'border-red-500/24 bg-red-500/10 text-red-300',
  }[tone]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-mono',
        toneClass
      )}
    >
      {children}
    </span>
  )
}

export function AdminListToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card/70 px-4 py-4 backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  )
}

export function AdminEmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/36 px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-muted-foreground">
        <MaterialSymbol icon={icon} size={22} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function AdminNotice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  children: ReactNode
}) {
  const toneClass = {
    neutral: 'border-border/70 bg-background/45 text-muted-foreground',
    accent: 'border-primary/22 bg-primary/10 text-foreground',
    success: 'border-primary/22 bg-primary/10 text-foreground',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    danger: 'border-red-500/20 bg-red-500/10 text-red-300',
  }[tone]

  return <div className={cn(ADMIN_NOTICE_CLASS, toneClass)}>{children}</div>
}
