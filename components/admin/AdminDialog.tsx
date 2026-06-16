'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

interface AdminDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: AdminDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
    } else {
      if (el.open) el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleClose = () => onClose()
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  const widthClass = { md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size]

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={`
        m-auto w-full ${widthClass} rounded-2xl border border-border/70
        bg-card p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm
        open:animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)]
        focus:outline-none
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
        >
          <MaterialSymbol icon="close" size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[72vh] overflow-y-auto px-5 py-5">{children}</div>

      {/* Footer */}
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  )
}
