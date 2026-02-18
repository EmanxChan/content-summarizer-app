'use client'

import { Youtube, Mic, FileText, MessageCircle, Clock } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { id: 'youtube',  label: 'YouTube',  Icon: Youtube },
  { id: 'podcast',  label: 'Podcast',  Icon: Mic },
  { id: 'article',  label: 'Article',  Icon: FileText },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle },
  { id: 'history',  label: 'History',  Icon: Clock },
]

interface Props {
  active: string
  onChange: (tab: string) => void
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around px-2 pb-safe">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                className={isActive ? 'text-[var(--accent)]' : ''}
              />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
