'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import SummaryResult from '@/components/SummaryResult'

export default function TextTab() {
  const [text, setText] = useState('')
  const [words, setWords] = useState(300)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; summary: string; insights: string[]; highlights: string[]; next_steps: string[] } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || text.trim().length < 50) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), words }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', title: data.title, summary: data.summary, insights: data.insights, highlights: data.highlights, next_steps: data.next_steps }) })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Paste Text</h2>
        <p className="text-sm text-[var(--muted)]">Paste transcripts, notes, meeting summaries, or any text</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder="Paste your content here…"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none resize-none"
        />
        {text.length > 0 && (
          <p className="text-xs text-[var(--muted)]">{text.trim().split(/\s+/).length} words</p>
        )}
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--muted)] whitespace-nowrap">
            Length: <span className="font-semibold text-[var(--accent)]">{words} words</span>
          </label>
          <input
            type="range" min={100} max={1000} step={50}
            value={words} onChange={e => setWords(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <Button
          type="submit"
          loading={loading}
          disabled={text.trim().length < 50}
          className="w-full"
        >
          {loading ? 'Summarizing…' : 'Summarize'}
        </Button>
      </form>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && <SummaryResult {...result} />}
    </div>
  )
}
