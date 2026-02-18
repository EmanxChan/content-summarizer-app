'use client'

import { useState } from 'react'
import { MessageCircle, Send, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; url: string }[]
}

interface Props {
  title: string
  summary: string
  insights: string[]
}

export default function ChatSection({ title, summary, insights }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [webSearch, setWebSearch] = useState(true)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          webSearch,
          contentContext: { title, summary, insights },
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
      }])
    } catch (err: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <MessageCircle size={15} className="text-[var(--accent)]" />
          Ask About This Content
        </span>
        {open ? <ChevronUp size={15} className="text-[var(--muted)]" /> : <ChevronDown size={15} className="text-[var(--muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3">
          {/* Web search toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <div
              onClick={() => setWebSearch(w => !w)}
              className={clsx(
                'relative h-4 w-7 rounded-full transition-colors cursor-pointer',
                webSearch ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              )}
            >
              <span
                className={clsx(
                  'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
                  webSearch ? 'translate-x-3.5' : 'translate-x-0.5'
                )}
              />
            </div>
            <Globe size={11} className={webSearch ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
            <span className="text-[var(--muted)]">Web search {webSearch ? 'on' : 'off'}</span>
          </label>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={clsx(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={clsx(
                      'max-w-[85%] rounded px-3 py-2 text-xs',
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer opacity-70 hover:opacity-100">
                          {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                        </summary>
                        <ul className="mt-1 space-y-0.5">
                          {msg.sources.map((s, j) => (
                            <li key={j}>
                              <a href={s.url} target="_blank" rel="noopener noreferrer"
                                className="underline opacity-70 hover:opacity-100">{s.title}</a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded bg-[var(--bg)] border border-[var(--border)] px-3 py-2">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="What tools were mentioned? What's the main takeaway?"
              disabled={loading}
              className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
