'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import Card from '@/components/ui/Card'
import ChatSection from '@/components/ChatSection'

interface Props {
  title: string
  summary: string
  insights: string[]
}

export default function SummaryResult({ title, summary, insights }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const text = `# ${title}\n\n## Key Insights\n${insights.map((i, n) => `${n + 1}. ${i}`).join('\n')}\n\n## Summary\n${summary}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Title + copy */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--text)] leading-snug">{title}</h3>
        <button
          onClick={copy}
          className="shrink-0 flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Key Insights — gold accent */}
      {insights.length > 0 && (
        <Card gold>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
            Key Insights
          </p>
          <ol className="space-y-1.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--text)]">
                <span className="shrink-0 font-bold text-[var(--accent)]">{i + 1}.</span>
                {insight}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Summary — teal accent */}
      <Card teal>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Summary
        </p>
        <p className="text-sm leading-relaxed text-[var(--text)]">{summary}</p>
      </Card>

      {/* Chat Q&A */}
      <ChatSection title={title} summary={summary} insights={insights} />
    </div>
  )
}
