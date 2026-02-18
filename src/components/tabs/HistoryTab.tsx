'use client'

import { Clock, Youtube, FileText, Upload, Search } from 'lucide-react'

// Placeholder — will be wired to Supabase in Phase 4
const PLACEHOLDER = [
  { id: '1', title: 'How to build a startup in 2025', type: 'youtube', date: 'Today' },
  { id: '2', title: 'The future of AI agents', type: 'article', date: 'Yesterday' },
  { id: '3', title: 'Team meeting — Q1 planning', type: 'upload', date: '2 days ago' },
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  youtube:  <Youtube size={14} className="text-red-500" />,
  article:  <FileText size={14} className="text-[var(--navy)]" />,
  upload:   <Upload size={14} className="text-[var(--accent)]" />,
  search:   <Search size={14} className="text-[var(--gold)]" />,
}

export default function HistoryTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">History</h2>
        <p className="text-sm text-[var(--muted)]">Your recent summaries — syncs across devices once you sign in</p>
      </div>

      <div className="space-y-2">
        {PLACEHOLDER.map(item => (
          <button
            key={item.id}
            className="flex w-full items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:border-[var(--accent)]"
          >
            <span className="shrink-0">{TYPE_ICONS[item.type]}</span>
            <span className="flex-1 truncate text-sm font-medium text-[var(--text)]">
              {item.title}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted)]">
              <Clock size={11} /> {item.date}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--muted)]">
          Sign in to sync your history across phone and desktop
        </p>
      </div>
    </div>
  )
}
