import { cn } from '../../lib/cn'

/** Initials avatar tinted by a hex color. */
export function Avatar({
  name,
  color = '#1a5f7a',
  size = 'md',
  src,
  className,
}: {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  src?: string
  className?: string
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  }

  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  }

  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-bold text-white', sizes[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
