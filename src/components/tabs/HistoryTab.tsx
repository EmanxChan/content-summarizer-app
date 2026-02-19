'use client'

import { useState, useEffect } from 'react'
import { Clock, Trash2, ChevronDown, ChevronUp, Youtube, FileText, Type, Mic, RefreshCw } from 'lucide-react'
import SummaryResult from '@/components/SummaryResult'

interface Summary {
  id: string
  created_at: string
  type: string
  title: string
  url: string | null
  podcast_name: string | null
  summary: string
  insights: string[]
  highlights: string[]
  next_steps: string[]
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  youtube: <Youtube size={12} />,
  article: <FileText size={12} />,
  text:    <Type size={12} />,
  podcast: <Mic size={12} />,
}

const TYPE_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  article: 'Article',
  text:    'Text',
  podcast: 'Podcast',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function HistoryTab() {
  const [items, setItems] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setItems(prev => prev.filter(i => i.id !== id))
      if (expanded === id) setExpanded(null)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">History</h2>
          <p className="text-sm text-[var(--muted)]">Your last 50 summaries</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Clock size={32} className="text-[var(--border)]" />
          <p className="text-sm font-medium text-[var(--text)]">No summaries yet</p>
          <p className="text-xs text-[var(--muted)]">
            Summaries from YouTube, Articles, Podcasts and Text will appear here automatically
          </p>
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="rounded border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex items-center gap-1 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                {TYPE_ICON[item.type] ?? <FileText size={12} />}
                {TYPE_LABEL[item.type] ?? item.type}
              </span>

              <button
                onClick={() => setExpanded(e => e === item.id ? null : item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-[var(--text)]">
                  {item.podcast_name ? `${item.podcast_name} — ` : ''}{item.title}
                </p>
                <p className="text-[11px] text-[var(--muted)]">{timeAgo(item.created_at)}</p>
              </button>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="text-[var(--muted)] hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setExpanded(e => e === item.id ? null : item.id)}
                  className="text-[var(--muted)]">
                  {expanded === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {expanded === item.id && (
              <div className="border-t border-[var(--border)] px-4 pb-4 pt-2">
                <SummaryResult
                  title={item.title}
                  summary={item.summary}
                  insights={item.insights}
                  highlights={item.highlights}
                  next_steps={item.next_steps}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
