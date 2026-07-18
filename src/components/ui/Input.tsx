import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('input-base', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('input-base min-h-[90px] resize-y', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export interface FieldProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

/** Label + control wrapper used by forms. */
export function Field({ label, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="text-danger ms-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-xs text-slate-400 dark:text-slate-400">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
