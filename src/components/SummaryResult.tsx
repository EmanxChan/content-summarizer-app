'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Download, FileText, FileDown, Printer, RefreshCw, Share2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import ChatSection from '@/components/ChatSection'

interface Props {
  title: string
  summary: string
  insights: string[]
  highlights?: string[]
  next_steps?: string[]
  onRegenerate?: () => void
}

const INSIGHT_EMOJIS = ['🎯', '💡', '⚠️', '🔄', '🧠']

export default function SummaryResult({
  title,
  summary,
  insights,
  highlights = [],
  next_steps = [],
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDownload(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Build export content ─────────────────────────────────────────────────
  function buildMarkdown() {
    const date = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    let md = `# ${title}\nGenerated: ${date}\n\n`
    md += `---\n\n## 🎯 Key Insights\n\n`
    insights.forEach((ins, i) => { md += `${INSIGHT_EMOJIS[i] || '•'} ${ins}\n\n` })
    if (highlights.length > 0) {
      md += `---\n\n## ⭐ Highlights\n\n`
      highlights.forEach(h => { md += `> ${h}\n\n` })
    }
    md += `---\n\n## 📝 Executive Summary\n\n${summary}\n\n`
    if (next_steps.length > 0) {
      md += `---\n\n## 🚀 Next Steps\n\n`
      next_steps.forEach((s, i) => { md += `${i + 1}. ${s}\n` })
    }
    return md
  }

  function buildText() {
    const date = new Date().toLocaleString()
    const line = '─'.repeat(60)
    let txt = `${title}\nGenerated: ${date}\n\n${line}\n\n`
    txt += `KEY INSIGHTS\n\n`
    insights.forEach((ins, i) => { txt += `${INSIGHT_EMOJIS[i] || '•'} ${ins}\n\n` })
    if (highlights.length > 0) {
      txt += `${line}\n\nHIGHLIGHTS\n\n`
      highlights.forEach(h => { txt += `"${h}"\n\n` })
    }
    txt += `${line}\n\nEXECUTIVE SUMMARY\n\n${summary}\n\n`
    if (next_steps.length > 0) {
      txt += `${line}\n\nNEXT STEPS\n\n`
      next_steps.forEach((s, i) => { txt += `${i + 1}. ${s}\n` })
    }
    return txt
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const slug = title.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()

  async function copy() {
    await navigator.clipboard.writeText(buildMarkdown())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    const text = buildText()
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
      } else {
        await navigator.clipboard.writeText(text)
      }
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* dismissed */ }
  }

  return (
    <div className="space-y-4 pt-2">

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--text)] leading-snug">{title}</h3>
        <div className="flex shrink-0 items-center gap-3">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              <RefreshCw size={13} /> Regenerate
            </button>
          )}
          <button
            onClick={share}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            {shared ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />}
            {shared ? 'Shared!' : 'Share'}
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Download dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDownload(d => !d)}
              className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Download size={13} />
              Download
            </button>
            {showDownload && (
              <div className="absolute right-0 top-6 z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl">
                <button
                  onClick={() => { downloadFile(buildMarkdown(), `${slug}.md`, 'text/markdown'); setShowDownload(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                >
                  <FileText size={12} className="text-[var(--accent)]" />
                  Markdown (.md)
                </button>
                <button
                  onClick={() => { downloadFile(buildText(), `${slug}.txt`, 'text/plain'); setShowDownload(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                >
                  <FileDown size={12} className="text-[var(--accent)]" />
                  Plain text (.txt)
                </button>
                <hr className="my-1 border-[var(--border)]" />
                <button
                  onClick={() => { window.print(); setShowDownload(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                >
                  <Printer size={12} className="text-[var(--accent)]" />
                  Save as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 Key Insights */}
      {insights.length > 0 && (
        <Card gold>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
            🎯 Key Insights
          </p>
          <ol className="space-y-2.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--text)]">
                <span className="shrink-0 text-base leading-tight">{INSIGHT_EMOJIS[i] ?? '•'}</span>
                <span className="leading-relaxed">
                  <strong className="font-semibold">{insight}</strong>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ⭐ Highlights */}
      {highlights.length > 0 && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
            ⭐ Highlights
          </p>
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-[var(--accent)] pl-3 text-sm italic text-[var(--text)] leading-relaxed"
              >
                {h}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* 📝 Executive Summary */}
      <Card teal>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
          📝 Executive Summary
        </p>
        <p className="text-sm leading-relaxed text-[var(--text)]">{summary}</p>
      </Card>

      {/* 🚀 Next Steps */}
      {next_steps.length > 0 && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            🚀 Next Steps
          </p>
          <ol className="space-y-2.5">
            {next_steps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--text)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Ask about this content */}
      <ChatSection title={title} summary={summary} insights={insights} />
    </div>
  )
}
