import { clsx } from 'clsx'

interface Props {
  children: React.ReactNode
  className?: string
  gold?: boolean   // gold left-border accent (for Key Insights)
  teal?: boolean   // teal left-border accent
}

export default function Card({ children, className, gold, teal }: Props) {
  return (
    <div
      className={clsx(
        'rounded bg-[var(--surface)] p-4 shadow-sm',
        gold && 'border-l-4 border-[var(--gold)]',
        teal && 'border-l-4 border-[var(--accent)]',
        !gold && !teal && 'border border-[var(--border)]',
        className
      )}
    >
      {children}
    </div>
  )
}
