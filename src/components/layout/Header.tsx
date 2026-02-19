'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export default function Header() {
  const [dark, setDark] = useState(false)
  const { canInstall, install } = useInstallPrompt()

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setDark(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="gradient-bar h-5 w-1 rounded-full" />
          <span className="text-base font-bold tracking-tight text-[var(--text)]">
            Content<span className="text-[var(--accent)]">·AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* PWA install button — only shows when browser offers install */}
          {canInstall && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
            >
              <Download size={12} /> Install App
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(d => !d)}
            aria-label="Toggle dark mode"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  )
}
