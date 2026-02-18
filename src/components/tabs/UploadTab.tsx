'use client'

import { useState, useRef } from 'react'
import { Upload, FileAudio, FileVideo, File } from 'lucide-react'
import Button from '@/components/ui/Button'
import SummaryResult from '@/components/SummaryResult'

const ACCEPTED = '.mp4,.mp3,.m4a,.wav,.mov,.avi,.pdf'

export default function UploadTab() {
  const [file, setFile] = useState<File | null>(null)
  const [words, setWords] = useState(300)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<{ summary: string; insights: string[]; title: string } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function getFileIcon() {
    if (!file) return <Upload size={32} className="text-[var(--muted)]" />
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (['mp3', 'm4a', 'wav'].includes(ext || '')) return <FileAudio size={32} className="text-[var(--accent)]" />
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return <FileVideo size={32} className="text-[var(--accent)]" />
    return <File size={32} className="text-[var(--accent)]" />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    setProgress('Uploading file…')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('words', String(words))

      setProgress('Transcribing audio…')
      const res = await fetch('/api/summarize', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Upload File</h2>
        <p className="text-sm text-[var(--muted)]">Audio, video, or PDF — Zoom recordings, podcasts, documents</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Drop zone */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded border-2 border-dashed border-[var(--border)] bg-[var(--surface)] py-10 text-center transition-colors hover:border-[var(--accent)]"
        >
          {getFileIcon()}
          {file ? (
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{file.name}</p>
              <p className="text-xs text-[var(--muted)]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Click to upload</p>
              <p className="text-xs text-[var(--muted)]">MP4, MP3, M4A, WAV, MOV, AVI, PDF</p>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)}
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

        <Button type="submit" loading={loading} disabled={!file} className="w-full">
          {loading ? progress || 'Processing…' : 'Summarize'}
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
