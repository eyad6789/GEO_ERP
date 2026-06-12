import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface ComboOption {
  value: string
  label: string
}

/**
 * Searchable single-select (combobox). Type to filter, click or Enter to pick.
 * The options dropdown is rendered in a portal with fixed positioning so it is
 * never clipped by scrolling dialogs or `overflow-hidden` table wrappers.
 *
 * Keyboard: ↑/↓ move the highlight, Enter selects the highlighted option (and
 * stops propagation so the form-level Enter-navigation doesn't also fire). When
 * the list is closed, Enter bubbles up so Enter-to-next-field still works.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const updateRect = () => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
  }

  useEffect(() => {
    if (!open) return
    updateRect()
    const onScroll = () => updateRect()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const openList = () => {
    if (disabled) return
    setQuery('')
    setHi(0)
    setOpen(true)
    updateRect()
  }
  const choose = (o: ComboOption) => {
    onChange(o.value)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation() // arrows drive the dropdown, not form-field navigation
      setOpen(true)
      setHi((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      setHi((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      // Plain Enter picks the highlighted option; Shift+Enter must fall through
      // so the form's Enter-navigation can move BACKWARD to the previous field.
      if (!e.shiftKey && open && filtered[hi]) {
        e.preventDefault()
        e.stopPropagation()
        choose(filtered[hi])
      }
      // closed, or Shift+Enter: let it bubble to the form navigation handler
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation()
        setOpen(false)
      }
    }
  }

  const displayValue = open ? query : selected?.label ?? ''

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className={cn('input-base pe-9', className)}
        placeholder={selected && !open ? undefined : placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHi(0)
        }}
        onFocus={openList}
        onMouseDown={() => {
          if (!open) openList()
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      {open &&
        rect &&
        createPortal(
          <ul
            style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 70 }}
            className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">—</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(o)
                  }}
                  onMouseEnter={() => setHi(i)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm',
                    i === hi ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  )
}
