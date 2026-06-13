import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '../ui/Input'

// Group the integer part with thousands separators while preserving any
// in-progress decimal the user is typing (e.g. "1500000" → "1,500,000",
// "1234.5" → "1,234.5", "12." → "12.").
export function formatThousands(raw: string): string {
  if (raw === '' || raw === '-') return raw
  const neg = raw.startsWith('-')
  const body = neg ? raw.slice(1) : raw
  const [intPart, ...rest] = body.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimal = rest.length ? '.' + rest.join('') : ''
  return (neg ? '-' : '') + grouped + decimal
}

// Strip separators back to a canonical numeric string for state.
function unformat(display: string): string {
  return display.replace(/,/g, '')
}

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Canonical numeric string (no separators), e.g. "1500000". */
  value: string
  /** Called with the canonical numeric string (no separators). */
  onValueChange: (value: string) => void
}

/**
 * Text input that shows thousands separators as the user types but stores and
 * emits a plain numeric string. Use across all numeric money/quantity fields.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, className, inputMode = 'decimal', placeholder = '0', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = unformat(e.target.value)
      // Allow only digits, one dot, optional leading minus.
      if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) onValueChange(raw)
    }
    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode}
        value={formatThousands(value)}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    )
  },
)
NumberInput.displayName = 'NumberInput'
