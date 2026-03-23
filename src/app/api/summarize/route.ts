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

interface YouTubeResult {
  title: string
  transcript: string
  available: true
}

interface YouTubeUnavailable {
  available: false
  reason: string
}

type YouTubeFallbackResult = YouTubeResult | YouTubeUnavailable

async function getYouTubeTranscript(url: string): Promise<YouTubeFallbackResult> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) return { available: false, reason: 'Invalid YouTube URL' }
  const videoId = match[1]

  // Fetch title from YouTube page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const html = await pageRes.text()
  const titleMatch = html.match(/<title>(.+?)<\/title>/)
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video'

  // ── Attempt 1: youtube-transcript package ───────────────────────────────
  try {
    const { YoutubeTranscript } = await import('youtube-transcript')
    const segments = await YoutubeTranscript.fetchTranscript(videoId)
    if (segments && segments.length > 0) {
      const transcript = segments.map(s => s.text).join(' ')
      return { title, transcript, available: true }
    }
  } catch {
    // Fall through to attempt 2
  }

  // ── Attempt 2: yt-dlp --write-subs --skip-download ──────────────────────
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-subs-'))
  try {
    execSync(
      `yt-dlp --write-subs --write-auto-subs --sub-langs en --skip-download --output "${tmpDir}/%(id)s" "${videoId}"`,
      { timeout: 30000, stdio: 'pipe' }
    )
    const files = fs.readdirSync(tmpDir)
    const vttFile = files.find(f => f.endsWith('.vtt') || f.endsWith('.srt'))
    if (vttFile) {
      const raw = fs.readFileSync(path.join(tmpDir, vttFile), 'utf-8')
      const transcript = raw
        .replace(/WEBVTT[\s\S]*?\n\n/, '')
        .replace(/\d+\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\n/g, '')
        .replace(/<\/?[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      if (transcript.length > 50) {
        return { title, transcript, available: true }
      }
    }
  } catch {
    // Fall through to attempt 3
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  // ── Attempt 3: YouTube oEmbed API for video description ─────────────────
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (oembedRes.ok) {
      const oembed = await oembedRes.json() as { title?: string; description?: string }
      const description = oembed.description || ''
      if (description.length > 50) {
        return { title: oembed.title || title, transcript: description, available: true }
      }
    }
  } catch {
    // Fall through — all attempts exhausted
  }

  return {
    available: false,
    reason: 'No captions available for this video. The creator has not enabled transcripts and no subtitles were found. Try a different video.',
  }
}

async function summarizeText(
  text: string,
  title: string,
  wordCount: number,
  instructions?: string
): Promise<{ summary: string; insights: string[]; highlights: string[]; next_steps: string[] }> {
  const completion = await getGroq().chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'system',
        content: `You are an expert summarizer. Always respond with valid JSON:
{"insights": ["...", "...", "...", "...", "..."], "highlights": ["...", "...", "..."], "summary": "...", "next_steps": ["...", "...", "..."]}
insights: 5 concise, bold takeaways (one sentence each).
highlights: 3-5 memorable quotes or key statements directly from the content.
summary: executive summary of ${wordCount} words.
next_steps: 3 specific, actionable steps the reader should take.${instructions ? `\n\nAdditional focus: ${instructions}` : ''}`,
      },
      {
        role: 'user',
        content: `Summarize this content titled "${title}":\n\n${text.slice(0, 12000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.4,
  })

  const raw = completion.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)
  return {
    summary: parsed.summary || '',
    insights: parsed.insights || [],
    highlights: parsed.highlights || [],
    next_steps: parsed.next_steps || [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let url = '', text = '', words = 300, instructions = ''

    if (contentType.includes('multipart/form-data')) {
      // File upload — Phase 5
      return NextResponse.json({ error: 'File upload coming in Phase 5' }, { status: 501 })
    } else {
      const body = await req.json()
      url = body.url || ''
      text = body.text || ''
      words = body.words || 300
      instructions = body.instructions || ''
    }

    let title = 'Content'
    let transcript = text

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      const ytResult = await getYouTubeTranscript(url)
      if (!ytResult.available) {
        return NextResponse.json({ error: ytResult.reason }, { status: 422 })
      }
      title = ytResult.title
      transcript = ytResult.transcript
    } else if (url) {
      return NextResponse.json({ error: 'Use the Article tab for non-YouTube URLs' }, { status: 400 })
    }

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'No content to summarize' }, { status: 400 })
    }

    const result = await summarizeText(transcript, title, words, instructions)
    return NextResponse.json({ title, ...result })
  } catch (err: unknown) {
    console.error('Summarize error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to summarize' },
      { status: 500 }
    )
  }
}
