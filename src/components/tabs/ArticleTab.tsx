'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SummaryResult from '@/components/SummaryResult'

export default function ArticleTab() {
  const [url, setUrl] = useState('')
  const [words, setWords] = useState(300)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ title: string; summary: string; insights: string[]; highlights: string[]; next_steps: string[] } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), words }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Article or Webpage</h2>
        <p className="text-sm text-[var(--muted)]">Paste any article, blog post, or X/Twitter URL</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com/article or https://x.com/..."
          type="url"
        />
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
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Extracting…' : 'Summarize'}
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
