import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { CURRENCIES, type Currency } from '../../types'

/** Amount field + currency selector, side by side. */
export function CurrencyInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  disabled,
}: {
  amount: number | string
  currency: Currency
  onAmountChange: (v: number) => void
  onCurrencyChange?: (c: Currency) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="number"
        value={amount}
        disabled={disabled}
        onChange={(e) => onAmountChange(Number(e.target.value))}
        className="flex-1 tabular-nums"
      />
      <Select
        value={currency}
        disabled={disabled || !onCurrencyChange}
        onChange={(e) => onCurrencyChange?.(e.target.value as Currency)}
        className="w-24"
        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
      />
    </div>
  )
}
