'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Globe, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; url: string }[]
}

export default function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [webSearch, setWebSearch] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        body: JSON.stringify({ question, webSearch, history: messages.slice(-6) }),
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
    <div className="flex h-[calc(100dvh-10rem)] flex-col md:h-[600px]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">AI Research Assistant</h2>
          <p className="text-sm text-[var(--muted)]">Ask anything — powered by Tavily + Groq</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      {/* Web search toggle */}
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
        <div
          onClick={() => setWebSearch(w => !w)}
          className={clsx(
            'relative h-5 w-9 rounded-full transition-colors',
            webSearch ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              webSearch ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </div>
        <Globe size={14} className={webSearch ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
        <span className={webSearch ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
          Web search {webSearch ? 'on' : 'off'}
        </span>
      </label>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="gradient-bar h-8 w-8 rounded-full" />
            <p className="text-sm font-medium text-[var(--text)]">Ask me anything</p>
            <p className="text-xs text-[var(--muted)]">
              Try: &quot;What are the latest AI trends?&quot; or &quot;Explain quantum computing&quot;
            </p>
          </div>
        )}

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
                'max-w-[85%] rounded px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">
                    {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {msg.sources.map((s, j) => (
                      <li key={j}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline opacity-70 hover:opacity-100"
                        >
                          {s.title}
                        </a>
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
            <div className="flex items-center gap-1.5 rounded bg-[var(--surface)] border border-[var(--border)] px-3 py-2">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything…"
          disabled={loading}
          className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-transform active:scale-95 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
