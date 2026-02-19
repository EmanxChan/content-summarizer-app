'use client'

import { useState, useEffect, useMemo } from 'react'
import { Clock, Trash2, ChevronDown, ChevronUp, Youtube, FileText, Type, Mic, Upload, RefreshCw, Search, X, Share2, Check } from 'lucide-react'
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

const TYPES = [
  { id: 'all',     label: 'All' },
  { id: 'youtube', label: 'YouTube', Icon: Youtube },
  { id: 'article', label: 'Article', Icon: FileText },
  { id: 'podcast', label: 'Podcast', Icon: Mic },
  { id: 'text',    label: 'Text',    Icon: Type },
  { id: 'upload',  label: 'Upload',  Icon: Upload },
] as const

const TYPE_ICON: Record<string, React.ReactNode> = {
  youtube: <Youtube size={12} />,
  article: <FileText size={12} />,
  text:    <Type size={12} />,
  podcast: <Mic size={12} />,
  upload:  <Upload size={12} />,
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
  const [shared, setShared] = useState<string | null>(null)

  async function handleShare(item: Summary) {
    const text = `${item.title}\n\n${item.summary}`
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text })
      } else {
        await navigator.clipboard.writeText(text)
      }
      setShared(item.id)
      setTimeout(() => setShared(null), 2000)
    } catch { /* dismissed */ }
  }
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter(item => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.podcast_name?.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [items, search, typeFilter])

  const hasFilters = search || typeFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">History</h2>
          <p className="text-sm text-[var(--muted)]">
            {items.length > 0
              ? `${filtered.length} of ${items.length} summaries`
              : 'Your last 50 summaries'}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search + filters — only show once items are loaded */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search titles, podcasts, summaries…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-9 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TYPES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTypeFilter(id)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  typeFilter === id
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {label}
              </button>
            ))}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setTypeFilter('all') }}
                className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
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

      {/* Empty states */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Clock size={32} className="text-[var(--border)]" />
          <p className="text-sm font-medium text-[var(--text)]">No summaries yet</p>
          <p className="text-xs text-[var(--muted)]">
            Summaries from YouTube, Articles, Podcasts and Text will appear here automatically
          </p>
        </div>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <Search size={28} className="text-[var(--border)]" />
          <p className="text-sm font-medium text-[var(--text)]">No results</p>
          <p className="text-xs text-[var(--muted)]">Try a different search or filter</p>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="rounded border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex items-center gap-1 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                {TYPE_ICON[item.type] ?? <FileText size={12} />}
                {TYPES.find(t => t.id === item.type)?.label ?? item.type}
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
                  onClick={() => handleShare(item)}
                  className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                  title="Share"
                >
                  {shared === item.id ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="text-[var(--muted)] hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setExpanded(e => e === item.id ? null : item.id)}
                  className="text-[var(--muted)]"
                >
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
