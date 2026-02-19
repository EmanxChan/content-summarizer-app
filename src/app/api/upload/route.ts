import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import OpenAI from 'openai'

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

    // ── PDF: extract text ──────────────────────────────────────────────────
    if (isPdf) {
      const buffer = Buffer.from(await file.arrayBuffer())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParseMod = await import('pdf-parse') as any
      const parsed = await (pdfParseMod.default ?? pdfParseMod)(buffer) as { text: string; info: Record<string, string> }
      content = parsed.text?.trim() || ''
      if (parsed.info?.Title) title = parsed.info.Title
      if (!content || content.length < 50) {
        return NextResponse.json({ error: 'Could not extract text from this PDF — it may be scanned or image-based' }, { status: 422 })
      }
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
next_steps: 3 specific, actionable steps the reader should take.`,
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
