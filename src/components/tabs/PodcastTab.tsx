'use client'

import { useState } from 'react'
import { Mic, Search, Link, Clock, ExternalLink } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SummaryResult from '@/components/SummaryResult'
import { useWordCount } from '@/hooks/useWordCount'

interface PodcastResult {
  title: string
  podcast: string
  thumbnail: string | null
  duration: number | null
  publishedAt: string | null
  audioUrl: string | null
  listenUrl: string | null
  contentSource: 'transcript' | 'description'
  summary: string
  insights: string[]
  highlights: string[]
  next_steps: string[]
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function PodcastTab() {
  const [mode, setMode] = useState<'search' | 'url'>('search')
  const [query, setQuery] = useState('')
  const [words, setWords] = useWordCount()
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PodcastResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), mode, words, instructions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process podcast')
      setResult(data)
      fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'podcast', title: data.title, podcast_name: data.podcast, summary: data.summary, insights: data.insights, highlights: data.highlights, next_steps: data.next_steps }) })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Podcast Summarizer</h2>
        <p className="text-sm text-[var(--muted)]">Search any podcast or paste a URL — powered by Listen Notes</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
        <button
          onClick={() => { setMode('search'); setQuery('') }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            mode === 'search'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Search size={12} /> Search
        </button>
        <button
          onClick={() => { setMode('url'); setQuery('') }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            mode === 'url'
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Link size={12} /> URL / RSS
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={
            mode === 'search'
              ? 'e.g. "Huberman Lab sleep" or "All-In latest episode"'
              : 'Apple Podcasts, Spotify, RSS feed, or .mp3 URL'
          }
          type="text"
        />

        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--muted)] whitespace-nowrap">
            Summary length: <span className="font-semibold text-[var(--accent)]">{words} words</span>
          </label>
          <input
            type="range" min={100} max={1000} step={50}
            value={words} onChange={e => setWords(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>

        <input
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Custom focus e.g. 'focus on guest's key arguments' (optional)"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        />
        <Button type="submit" loading={loading} className="w-full">
          <Mic size={14} />
          {loading ? 'Processing podcast…' : 'Summarize Episode'}
        </Button>
      </form>

      {/* Hint pills */}
      {!result && !loading && (
        <div className="flex flex-wrap gap-2">
          {['Lex Fridman - latest', 'My First Million trends', 'Diary of a CEO'].map(hint => (
            <button
              key={hint}
              onClick={() => { setMode('search'); setQuery(hint) }}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Episode metadata card */}
          <div className="flex gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
            {result.thumbnail && (
              <img
                src={result.thumbnail}
                alt={result.podcast}
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            )}
            {!result.thumbnail && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[var(--bg)]">
                <Mic size={20} className="text-[var(--accent)]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                {result.podcast}
              </p>
              <p className="text-sm font-medium text-[var(--text)] leading-snug mt-0.5">{result.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                {result.duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {formatDuration(result.duration)}
                  </span>
                )}
                {result.publishedAt && <span>{result.publishedAt}</span>}
                <span className="rounded-full bg-[var(--bg)] px-2 py-0.5">
                  {result.contentSource === 'transcript' ? '🎙 Transcript' : '📝 Show notes'}
                </span>
                {result.listenUrl && (
                  <a
                    href={result.listenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 hover:text-[var(--accent)] transition-colors"
                  >
                    <ExternalLink size={10} /> Listen Notes
                  </a>
                )}
              </div>
            </div>
          </div>

          <SummaryResult
            title={result.title}
            summary={result.summary}
            insights={result.insights}
            highlights={result.highlights}
            next_steps={result.next_steps}
            onRegenerate={handleSubmit as unknown as () => void}
          />
        </div>
      )}
    </div>
  )
}
