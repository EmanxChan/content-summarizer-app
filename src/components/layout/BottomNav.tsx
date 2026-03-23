'use client'

import { Youtube, Mic, FileText, MessageCircle, Clock, Type, Upload } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { id: 'youtube',  label: 'YouTube',  Icon: Youtube },
  { id: 'podcast',  label: 'Podcast',  Icon: Mic },
  { id: 'article',  label: 'Article',  Icon: FileText },
  { id: 'text',     label: 'Text',     Icon: Type },
  { id: 'upload',   label: 'Upload',   Icon: Upload },
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
      <div className="flex h-12 items-center justify-around px-1 pb-safe">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-label={label}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center py-1 transition-colors',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
