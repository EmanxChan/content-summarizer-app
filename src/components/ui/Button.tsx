import { clsx } from 'clsx'
import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        // Size
        size === 'sm' && 'h-8 rounded-full px-4 text-sm',
        size === 'md' && 'h-10 rounded-full px-6 text-sm',
        size === 'lg' && 'h-12 rounded-full px-8 text-base',
        // Variant
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:opacity-90',
        variant === 'secondary' && 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
        variant === 'ghost' && 'text-[var(--muted)] hover:text-[var(--accent)]',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : children}
    </button>
  )
}
