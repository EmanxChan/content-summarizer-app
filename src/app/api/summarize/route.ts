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

async function getYouTubeTranscript(url: string): Promise<{ title: string; transcript: string }> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) throw new Error('Invalid YouTube URL')
  const videoId = match[1]

  // Fetch title from YouTube page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const html = await pageRes.text()
  const titleMatch = html.match(/<title>(.+?)<\/title>/)
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video'

  // Fetch transcript
  const { YoutubeTranscript } = await import('youtube-transcript')
  const segments = await YoutubeTranscript.fetchTranscript(videoId)
  if (!segments || segments.length === 0) {
    throw new Error('No transcript available for this video. Try a video with captions enabled.')
  }
  const transcript = segments.map(s => s.text).join(' ')

  return { title, transcript }
}

async function summarizeText(
  text: string,
  title: string,
  wordCount: number
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
next_steps: 3 specific, actionable steps the reader should take.`,
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
    let url = '', text = '', words = 300

    if (contentType.includes('multipart/form-data')) {
      // File upload — Phase 5
      return NextResponse.json({ error: 'File upload coming in Phase 5' }, { status: 501 })
    } else {
      const body = await req.json()
      url = body.url || ''
      text = body.text || ''
      words = body.words || 300
    }

    let title = 'Content'
    let transcript = text

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      const yt = await getYouTubeTranscript(url)
      title = yt.title
      transcript = yt.transcript
    } else if (url) {
      return NextResponse.json({ error: 'Use the Article tab for non-YouTube URLs' }, { status: 400 })
    }

    if (!transcript || transcript.trim().length < 20) {
      return NextResponse.json({ error: 'No content to summarize' }, { status: 400 })
    }

    const result = await summarizeText(transcript, title, words)
    return NextResponse.json({ title, ...result })
  } catch (err: unknown) {
    console.error('Summarize error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to summarize' },
      { status: 500 }
    )
  }
}
