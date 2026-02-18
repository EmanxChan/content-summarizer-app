'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  size?: 'sm' | 'xs'
}

export default function MarkdownContent({ content, size = 'sm' }: Props) {
  const base = size === 'xs' ? 'text-xs' : 'text-sm'

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className={`font-bold text-[var(--text)] mb-2 mt-3 ${size === 'xs' ? 'text-sm' : 'text-base'}`}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className={`font-semibold text-[var(--text)] mb-1.5 mt-3 ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className={`font-semibold text-[var(--text)] mb-1 mt-2 ${base}`}>{children}</h3>
        ),
        p: ({ children }) => (
          <p className={`${base} text-[var(--text)] mb-2 last:mb-0 leading-relaxed`}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--text)]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[var(--text)]">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className={`${base} text-[var(--text)] mb-2 ml-4 list-disc space-y-1`}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className={`${base} text-[var(--text)] mb-2 ml-4 list-decimal space-y-1`}>{children}</ol>
        ),
        li: ({ children }) => (
          <li className={`${base} text-[var(--text)] leading-relaxed`}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--accent)] pl-3 italic text-[var(--muted)] my-2">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          return isBlock ? (
            <code className={`block bg-[var(--bg)] rounded p-2 ${base} font-mono text-[var(--text)] my-2 overflow-x-auto`}>
              {children}
            </code>
          ) : (
            <code className={`bg-[var(--bg)] rounded px-1 ${base} font-mono text-[var(--accent)]`}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="bg-[var(--bg)] rounded p-3 my-2 overflow-x-auto">{children}</pre>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} text-[var(--accent)] underline underline-offset-2 hover:opacity-80`}
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-[var(--border)] my-3" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className={`${base} w-full border-collapse text-[var(--text)]`}>{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--bg)] border-b border-[var(--border)]">{children}</thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-[var(--border)] last:border-0">{children}</tr>
        ),
        th: ({ children }) => (
          <th className={`${base} font-semibold text-[var(--text)] px-3 py-2 text-left`}>{children}</th>
        ),
        td: ({ children }) => (
          <td className={`${base} text-[var(--text)] px-3 py-2`}>{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
