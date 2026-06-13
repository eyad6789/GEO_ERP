import { Input } from '../ui/Input'

/** Side-by-side Arabic + English text inputs. */
export function BilingualField({
  valueAr,
  valueEn,
  onChangeAr,
  onChangeEn,
  placeholderAr = 'بالعربية',
  placeholderEn = 'In English',
}: {
  valueAr: string
  valueEn: string
  onChangeAr: (v: string) => void
  onChangeEn: (v: string) => void
  placeholderAr?: string
  placeholderEn?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input dir="rtl" value={valueAr} placeholder={placeholderAr} onChange={(e) => onChangeAr(e.target.value)} />
      <Input dir="ltr" value={valueEn} placeholder={placeholderEn} onChange={(e) => onChangeEn(e.target.value)} />
    </div>
  )
}
