import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import OpenAI from 'openai'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

function getGroq() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1',
  })
}

const MODEL = () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac', 'mp4', 'mov', 'webm', 'mpeg', 'mpga']
const MAX_BYTES = 24 * 1024 * 1024 // 24 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const words = Number(formData.get('words') || 300)
    const instructions = (formData.get('instructions') as string) || ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum is 24 MB` },
        { status: 413 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const isPdf = ext === 'pdf'
    const isAudio = AUDIO_EXTS.includes(ext)

    if (!isPdf && !isAudio) {
      return NextResponse.json(
        { error: `Unsupported file type (.${ext}). Upload audio, video, or PDF.` },
        { status: 400 }
      )
    }

    let title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    let content = ''
    let fileType: 'audio' | 'pdf' = isAudio ? 'audio' : 'pdf'

    // ── PDF: extract text (multi-step fallback) ───────────────────────────────
    if (isPdf) {
      const buffer = Buffer.from(await file.arrayBuffer())
      let extractedText = ''
      let extractionMethod = ''

      // ── Attempt 1: pdf-parse ──────────────────────────────────────────────
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParseMod = await import('pdf-parse') as any
        const parsed = await (pdfParseMod.default ?? pdfParseMod)(buffer) as { text: string; info: Record<string, string> }
        extractedText = parsed.text?.trim() || ''
        if (parsed.info?.Title) title = parsed.info.Title
        extractionMethod = 'pdf-parse'
      } catch {
        extractedText = ''
      }

      // ── Attempt 2: lit (LiteParse) — has built-in OCR fallback ───────────
      if (!extractedText || extractedText.length < 50) {
        const tmpPath = path.join(os.tmpdir(), `pdf-upload-${Date.now()}.pdf`)
        fs.writeFileSync(tmpPath, buffer)
        try {
          const litOut = execSync(`lit parse "${tmpPath}"`, { timeout: 60000, encoding: 'utf-8' })
          if (litOut && litOut.trim().length > 50) {
            extractedText = litOut.trim()
            extractionMethod = 'lit'
          }
        } catch {
          // lit also failed — try pdftotext as last resort
        } finally {
          fs.unlinkSync(tmpPath)
        }
      }

      // ── Attempt 3: pdftotext (Xpdf / poppler-utils) ──────────────────────
      if (!extractedText || extractedText.length < 50) {
        const tmpPath = path.join(os.tmpdir(), `pdf-upload-${Date.now()}.pdf`)
        fs.writeFileSync(tmpPath, buffer)
        try {
          const pdftotextOut = execSync(`pdftotext "${tmpPath}" -`, { timeout: 30000, encoding: 'utf-8' })
          if (pdftotextOut && pdftotextOut.trim().length > 50) {
            extractedText = pdftotextOut.trim()
            extractionMethod = 'pdftotext'
          }
        } catch {
          // all text extraction failed
        } finally {
          if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
        }
      }

      if (!extractedText || extractedText.length < 50) {
        return NextResponse.json({
          error: `Could not extract readable text from this PDF — it appears to be a scanned or image-based file. Try running it through an OCR tool (e.g. Adobe Acrobat, Google Docs OCR, or https://ocr.space) and re-uploading the processed PDF.`,
        }, { status: 422 })
      }

      content = extractedText
    }

    // ── Audio / Video: Groq Whisper ────────────────────────────────────────
    if (isAudio) {
      const transcription = await getGroq().audio.transcriptions.create({
        file,
        model: 'whisper-large-v3',
      })
      content = transcription.text?.trim() || ''
      if (!content || content.length < 50) {
        return NextResponse.json({ error: 'Could not transcribe audio — the file may be silent or corrupted' }, { status: 422 })
      }
    }

    // ── Summarize with Groq ────────────────────────────────────────────────
    const completion = await getGroq().chat.completions.create({
      model: MODEL(),
      messages: [
        {
          role: 'system',
          content: `You are an expert summarizer. Always respond with valid JSON:
{"insights": ["...", "...", "...", "...", "..."], "highlights": ["...", "...", "..."], "summary": "...", "next_steps": ["...", "...", "..."]}
insights: 5 concise, bold takeaways (one sentence each).
highlights: 3-5 memorable quotes or key statements directly from the content.
summary: executive summary of ${words} words.
next_steps: 3 specific, actionable steps the reader should take.${instructions ? `\n\nAdditional focus: ${instructions}` : ''}`,
        },
        {
          role: 'user',
          content: `Summarize this ${fileType === 'pdf' ? 'document' : 'audio transcript'} titled "${title}":\n\n${content.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.4,
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      title,
      fileType,
      summary: parsed.summary || '',
      insights: parsed.insights || [],
      highlights: parsed.highlights || [],
      next_steps: parsed.next_steps || [],
    })
  } catch (err: unknown) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process file' },
      { status: 500 }
    )
  }
}
