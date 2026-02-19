'use client'

import { useState, useRef } from 'react'
import { Upload, FileAudio, FileVideo, FileText, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import SummaryResult from '@/components/SummaryResult'

const ACCEPTED = '.mp3,.m4a,.wav,.ogg,.aac,.mp4,.mov,.webm,.pdf'
const MAX_MB = 24

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ name, size }: { name: string; size: number }) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const cls = `text-[var(--accent)]`
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(ext)) return <FileAudio size={size} className={cls} />
  if (['mp4', 'mov', 'webm', 'mpeg'].includes(ext)) return <FileVideo size={size} className={cls} />
  if (ext === 'pdf') return <FileText size={size} className={cls} />
  return <Upload size={size} className="text-[var(--muted)]" />
}

const STEPS: Record<string, string> = {
  uploading:    'Uploading file…',
  transcribing: 'Transcribing audio…',
  extracting:   'Extracting PDF text…',
  summarizing:  'Summarizing…',
}

export default function UploadTab() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [words, setWords] = useState(300)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState<{
    title: string; fileType: string; summary: string;
    insights: string[]; highlights: string[]; next_steps: string[]
  } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(f: File | null) {
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large (${formatSize(f.size)}). Maximum is ${MAX_MB} MB.`)
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    setStep(ext === 'pdf' ? 'extracting' : 'transcribing')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('words', String(words))

      setStep('uploading')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })

      setStep('summarizing')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process file')

      setResult(data)
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.fileType === 'pdf' ? 'text' : 'youtube',
          title: data.title,
          summary: data.summary,
          insights: data.insights,
          highlights: data.highlights,
          next_steps: data.next_steps,
        }),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">Upload File</h2>
        <p className="text-sm text-[var(--muted)]">
          Audio, video, or PDF — up to {MAX_MB} MB
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`relative flex w-full flex-col items-center gap-3 rounded border-2 border-dashed py-10 text-center transition-colors
            ${dragging ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--surface)]'}
            ${!file ? 'cursor-pointer hover:border-[var(--accent)]' : ''}`}
        >
          {file ? (
            <>
              <FileIcon name={file.name} size={36} />
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{file.name}</p>
                <p className="text-xs text-[var(--muted)]">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null); setResult(null) }}
                className="absolute right-3 top-3 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <Upload size={32} className="text-[var(--muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  {dragging ? 'Drop it here' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">MP3, M4A, WAV, MP4, MOV, PDF · max {MAX_MB} MB</p>
              </div>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0] ?? null)}
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
          {loading ? (STEPS[step] || 'Processing…') : 'Transcribe & Summarize'}
        </Button>
      </form>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {result && <SummaryResult {...result} />}
    </div>
  )
}
