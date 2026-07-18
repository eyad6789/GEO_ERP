import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
  /** When any option in the list carries this, options render as <optgroup> blocks by group (in first-seen order); ungrouped options render flat, before the groups. */
  group?: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[]
  placeholder?: string
}

function renderOptions(options: SelectOption[]) {
  if (!options.some((o) => o.group)) {
    return options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))
  }
  const ungrouped = options.filter((o) => !o.group)
  const groupOrder: string[] = []
  for (const o of options) {
    if (o.group && !groupOrder.includes(o.group)) groupOrder.push(o.group)
  }
  return (
    <>
      {ungrouped.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {groupOrder.map((g) => (
        <optgroup key={g} label={g}>
          {options
            .filter((o) => o.group === g)
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  )
}

/** Styled native select (RTL-safe). Children override options when provided. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn('input-base appearance-none pe-9 cursor-pointer', className)}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="">{placeholder}</option>
        )}
        {options ? renderOptions(options) : children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-400" />
    </div>
  ),
)
Select.displayName = 'Select'
