import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

interface PublicSymbolProps {
  icon: string
  className?: string
  size?: number
  'aria-label'?: string
  'aria-hidden'?: boolean
}

export function PublicSymbol({
  icon,
  className,
  size = 20,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: PublicSymbolProps) {
  return (
    <MaterialSymbol
      icon={icon}
      size={size}
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  )
}
