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

// ── Direct YouTube transcript fetch using native fetch ───────────────────────
async function fetchYouTubeTranscript(videoId: string): Promise<{ title: string; transcript: string }> {
  const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  // Step 1: Get the video page to extract caption track info
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (!pageRes.ok) throw new Error(`YouTube page returned ${pageRes.status}`)
  const pageHtml = await pageRes.text()

  // Extract title
  const titleMatch = pageHtml.match(/<title>(.+?)<\/title>/)
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video'

  // Step 2: Find captionTracks in ytInitialPlayerResponse
  // Look for the JSON blob that contains "captionTracks"
  const captionMatch = pageHtml.match(/"captions":\s*(\{[^}]+\"captionTracks\":\s*\[[^\]]+\])/)
  if (!captionMatch) {
    throw new Error('No captions found on this video page')
  }

  const captionData = JSON.parse(`{${captionMatch[1]}}`)
  const tracks = captionData?.playerCaptionsTracklistRenderer?.captionTracks
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('No caption tracks available')
  }

  // Find English track (prefer manual over auto-generated)
  const enTrack = (tracks as { baseUrl: string; languageCode: string; kind?: string }[])
    .find(t => t.languageCode === 'en' && !t.kind)
    || (tracks as { baseUrl: string; languageCode: string }[])
    .find(t => t.languageCode === 'en')
    || tracks[0]

  if (!enTrack?.baseUrl) {
    throw new Error('No English caption track found')
  }

  // Step 3: Fetch the transcript XML
  const transcriptRes = await fetch(enTrack.baseUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': `https://www.youtube.com/watch?v=${videoId}` },
  })
  if (!transcriptRes.ok) throw new Error(`Transcript fetch failed: ${transcriptRes.status}`)

  const transcriptXml = await transcriptRes.text()
  if (!transcriptXml || transcriptXml.trim().length < 50) {
    throw new Error('Transcript content is empty')
  }

  // Step 4: Parse VTT/srt into plain text
  const transcript = transcriptXml
    .replace(/WEBVTT[\s\S]*?\n\n/, '')       // remove VTT header
    .replace(/NOTE[\s\S]*?\n\n/, '')         // remove NOTE sections
    .replace(/<\/?[^>]+>/g, '')              // remove HTML/XML tags
    .replace(/\d+\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\n/g, '') // VTT timestamps
    .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\n/g, '') // short timestamps
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!transcript || transcript.length < 20) {
    throw new Error('Parsed transcript is too short')
  }

  return { title, transcript }
}

async function getYouTubeTranscript(url: string): Promise<{ title: string; transcript: string }> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) throw new Error('Invalid YouTube URL')
  const videoId = match[1]

  // ── Attempt 1: Direct fetch (most reliable, no dependencies) ─────────
  try {
    const result = await fetchYouTubeTranscript(videoId)
    console.log('✅ Direct fetch SUCCESS for', videoId, '-', result.transcript.length, 'chars')
    return result
  } catch (e) {
    console.error('❌ Direct fetch FAILED:', e instanceof Error ? e.message : e)
    // fall through to next attempt
  }

  // ── Attempt 2: youtube-transcript-plus npm package ──────────────────────
  try {
    const { YoutubeTranscript } = await import('youtube-transcript-plus')
    const segments = await YoutubeTranscript.fetchTranscript(videoId)
    if (segments && segments.length > 0) {
      const transcript = segments
        .map((s: { text: string }) => s.text)
        .join(' ')
        .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')

      // Get title from page
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      })
      const html = await pageRes.text()
      const titleMatch = html.match(/<title>(.+?)<\/title>/)
      const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video'

      console.log('✅ youtube-transcript-plus SUCCESS:', segments.length, 'segments')
      return { title, transcript }
    }
  } catch (e) {
    console.error('❌ youtube-transcript-plus FAILED:', e instanceof Error ? e.message : e)
  }

  // ── Attempt 3: youtube-transcript npm package (legacy) ──────────────────
  try {
    const { YoutubeTranscript: Legacy } = await import('youtube-transcript')
    const segments = await Legacy.fetchTranscript(videoId)
    if (segments && segments.length > 0) {
      const transcript = segments.map((s: { text: string }) => s.text).join(' ')
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const html = await pageRes.text()
      const titleMatch = html.match(/<title>(.+?)<\/title>/)
      const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video'

      console.log('✅ youtube-transcript SUCCESS:', segments.length, 'segments')
      return { title, transcript }
    }
  } catch (e) {
    console.error('❌ youtube-transcript FAILED:', e instanceof Error ? e.message : e)
  }

  throw new Error('No transcript available for this video. The creator has not enabled captions/subtitles. Try a different video.')
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
