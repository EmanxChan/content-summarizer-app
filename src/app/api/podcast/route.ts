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
const LISTEN_NOTES_BASE = 'https://listen-api.listennotes.com/api/v2'

function lnHeaders() {
  return { 'X-ListenAPI-Key': process.env.LISTEN_NOTES_API_KEY! }
}

interface EpisodeData {
  title: string
  podcast: string
  description: string
  audioUrl: string | null
  transcriptUrl?: string | null
  thumbnail?: string | null
  duration?: number | null
  publishedAt?: string | null
  listenUrl?: string | null
}

// ── Listen Notes: search episodes ────────────────────────────────────────────
async function searchEpisode(query: string): Promise<EpisodeData> {
  const url = `${LISTEN_NOTES_BASE}/search?q=${encodeURIComponent(query)}&type=episode&page_size=5&language=English`
  const res = await fetch(url, { headers: lnHeaders() })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Listen Notes search failed (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const ep = data.results?.[0]
  if (!ep) throw new Error('No podcast episode found for that search')

  return {
    title: ep.title_original || ep.title || 'Episode',
    podcast: ep.podcast?.title_original || ep.podcast?.title || 'Unknown Podcast',
    description: ep.description_original || ep.description || '',
    audioUrl: ep.audio || null,
    thumbnail: ep.thumbnail || ep.podcast?.thumbnail || null,
    duration: ep.audio_length_sec || null,
    publishedAt: ep.pub_date_ms ? new Date(ep.pub_date_ms).toLocaleDateString() : null,
    listenUrl: ep.listennotes_url || null,
  }
}

// ── RSS: parse feed XML ───────────────────────────────────────────────────────
function extractCdata(tag: string, xml: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))
  return m?.[1]?.trim() || ''
}

async function parseRssFeed(rssUrl: string): Promise<EpisodeData & { transcriptUrl: string | null }> {
  const res = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  const xml = await res.text()

  const showTitle = extractCdata('title', xml.split('<item>')[0] || xml)
  const firstItem = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1] || ''

  const title = extractCdata('title', firstItem)
  const description = extractCdata('description', firstItem) || extractCdata('content:encoded', firstItem)
  const audioMatch = firstItem.match(/<enclosure[^>]*url="([^"]+)"/)
  const transcriptMatch = firstItem.match(/<podcast:transcript[^>]*url="([^"]+)"/)

  return {
    title: title || 'Latest Episode',
    podcast: showTitle || 'Podcast',
    description: description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    audioUrl: audioMatch?.[1] || null,
    transcriptUrl: transcriptMatch?.[1] || null,
    thumbnail: null,
    duration: null,
    publishedAt: null,
    listenUrl: null,
  }
}

// ── Fetch Podcasting 2.0 transcript file ─────────────────────────────────────
async function fetchTranscript(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    return text
      .replace(/WEBVTT[\s\S]*?\n\n/, '')
      .replace(/\d+\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}\n/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim() || null
  } catch {
    return null
  }
}

// ── Scrape og:title from Apple/Spotify pages ──────────────────────────────────
async function scrapeOgTitle(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()
    const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    return m?.[1] || ''
  } catch {
    return ''
  }
}

// ── Resolve Apple Podcasts URL → RSS feed URL ───────────────────────────────
async function resolveApplePodcastsFeed(url: string): Promise<string | null> {
  try {
    // Extract numeric ID from Apple Podcasts URL (e.g. /id123456789)
    const idMatch = url.match(/\/id(\d+)/)
    if (idMatch?.[1]) {
      const lookupRes = await fetch(
        `https://itunes.apple.com/lookup?id=${idMatch[1]}&entity=podcast`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (lookupRes.ok) {
        const data = await lookupRes.json() as { results?: { feedUrl?: string }[] }
        if (data.results?.[0]?.feedUrl) return data.results[0].feedUrl
      }
    }

    // Fallback: try scraping the page for the RSS link
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await pageRes.text()
    const rssMatch = html.match(/href=["']([^"']*\.rss[^"']*)["']/i) ||
                     html.match(/data-feed-url=["']([^"']+)["']/i)
    return rssMatch?.[1] || null
  } catch {
    return null
  }
}

// ── Resolve Spotify episode/show URL → RSS feed URL ─────────────────────────
async function resolveSpotifyFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    // Spotify sometimes embeds RSS in og:url or hidden meta
    const rssMatch = html.match(/["'](https?:\/\/[^"']*\.rss[^"']*)["']/i)
    if (rssMatch?.[1]) return rssMatch[1]

    // Spotify episodes embed the show RSS in data attributes
    const showIdMatch = url.match(/spotify\.com\/(episode|show)\/([a-zA-Z0-9]+)/)
    if (showIdMatch?.[2]) {
      // Attempt to get the podcast's RSS via OpenSearch hint — fall back to search
      return null // handled by caller
    }
    return null
  } catch {
    return null
  }
}

// ── Audio transcription via Groq Whisper ──────────────────────────────────────
async function transcribeAudio(audioUrl: string): Promise<string> {
  const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error('Could not fetch audio file')

  const contentLength = res.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 24 * 1024 * 1024) {
    throw new Error('Audio file exceeds 24 MB — paste the RSS feed URL or search by name instead')
  }

  const buffer = await res.arrayBuffer()
  const blob = new Blob([buffer], { type: 'audio/mpeg' })
  const file = new File([blob], 'episode.mp3', { type: 'audio/mpeg' })

  const transcription = await getGroq().audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
  })
  return transcription.text
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isDirectAudioUrl(url: string) {
  const lower = url.toLowerCase()
  const exts = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac']
  const cdns = [
    'traffic.megaphone.fm', 'dts.podtrac.com', 'pdst.fm', 'anchor.fm',
    'buzzsprout.com', 'transistor.fm', 'simplecast.com', 'podbean.com',
    'spreaker.com', 'libsyn.com', 'chtbl.com', 'prfx.byspotify.com',
    'media.rss.com', 'media.blubrry.com',
  ]
  return exts.some(e => lower.includes(e)) || cdns.some(c => lower.includes(c))
}

function isRssUrl(url: string) {
  const lower = url.toLowerCase()
  return lower.endsWith('.rss') || lower.endsWith('.xml') ||
    lower.includes('/rss') || lower.includes('/feed') || lower.includes('feeds.')
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { query, mode, words = 300, instructions = '' } = await req.json()
    if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

    const input = query.trim()
    const isUrl = input.startsWith('http://') || input.startsWith('https://')

    let episodeData!: EpisodeData
    let contentForSummary = ''
    let contentSource = 'description'

    // ── URL mode: trust explicit mode flag, parse RSS directly for Apple/Spotify ──
    if (mode === 'url') {
      // Route URL1: Direct audio URL
      if (isUrl && isDirectAudioUrl(input)) {
        const urlObj = new URL(input)
        episodeData = {
          title: urlObj.pathname.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Podcast Episode',
          podcast: urlObj.hostname,
          description: '',
          audioUrl: input,
        }
        contentForSummary = await transcribeAudio(input)
        contentSource = 'transcript'
      }

      // Route URL2: RSS feed URL — parse directly without re-search
      else if (isUrl && isRssUrl(input)) {
        const rss = await parseRssFeed(input)
        episodeData = rss
        if (rss.transcriptUrl) {
          const t = await fetchTranscript(rss.transcriptUrl)
          if (t) { contentForSummary = t; contentSource = 'transcript' }
        }
        if (!contentForSummary && rss.audioUrl && isDirectAudioUrl(rss.audioUrl)) {
          try {
            contentForSummary = await transcribeAudio(rss.audioUrl)
            contentSource = 'transcript'
          } catch { /* fall through */ }
        }
        contentForSummary = contentForSummary || rss.description
      }

      // Route URL3: Apple Podcasts — resolve RSS feed and parse directly
      else if (isUrl && input.includes('podcasts.apple.com')) {
        const feedUrl = await resolveApplePodcastsFeed(input)
        if (feedUrl) {
          const rss = await parseRssFeed(feedUrl)
          episodeData = rss
          if (rss.transcriptUrl) {
            const t = await fetchTranscript(rss.transcriptUrl)
            if (t) { contentForSummary = t; contentSource = 'transcript' }
          }
          if (!contentForSummary && rss.audioUrl && isDirectAudioUrl(rss.audioUrl)) {
            try {
              contentForSummary = await transcribeAudio(rss.audioUrl)
              contentSource = 'transcript'
            } catch { /* fall through */ }
          }
          contentForSummary = contentForSummary || rss.description
        }
        if (!contentForSummary) {
          return NextResponse.json({ error: 'Could not resolve RSS feed for this Apple Podcasts URL. Try pasting the RSS feed URL directly.' }, { status: 422 })
        }
      }

      // Route URL4: Spotify — resolve RSS feed, or fall back to search
      else if (isUrl && input.includes('spotify.com')) {
        const feedUrl = await resolveSpotifyFeed(input)
        if (feedUrl) {
          const rss = await parseRssFeed(feedUrl)
          episodeData = rss
          if (rss.transcriptUrl) {
            const t = await fetchTranscript(rss.transcriptUrl)
            if (t) { contentForSummary = t; contentSource = 'transcript' }
          }
          if (!contentForSummary && rss.audioUrl && isDirectAudioUrl(rss.audioUrl)) {
            try {
              contentForSummary = await transcribeAudio(rss.audioUrl)
              contentSource = 'transcript'
            } catch { /* fall through */ }
          }
          contentForSummary = contentForSummary || rss.description
        }
        // If RSS resolution failed, fall back to search
        if (!contentForSummary) {
          if (!process.env.LISTEN_NOTES_API_KEY) {
            return NextResponse.json({ error: 'Could not resolve RSS feed for this Spotify URL and LISTEN_NOTES_API_KEY is not configured.' }, { status: 422 })
          }
          episodeData = await searchEpisode(input)
          contentForSummary = episodeData.description
        }
      }

      // Route URL5: Unknown URL format in URL mode — error
      else {
        return NextResponse.json({ error: 'Unrecognized URL. Paste an RSS feed, Apple Podcasts, Spotify, or direct audio URL.' }, { status: 400 })
      }
    }

    // ── Search mode (default) ───────────────────────────────────────────────
    else {
      if (!process.env.LISTEN_NOTES_API_KEY) {
        return NextResponse.json({ error: 'LISTEN_NOTES_API_KEY not configured in Vercel' }, { status: 503 })
      }
      episodeData = await searchEpisode(input)
      contentForSummary = episodeData.description
    }

    if (!contentForSummary || contentForSummary.trim().length < 50) {
      return NextResponse.json({ error: 'Not enough content found for this episode' }, { status: 422 })
    }

    // ── Summarize with Groq ────────────────────────────────────────────────
    const completion = await getGroq().chat.completions.create({
      model: MODEL(),
      messages: [
        {
          role: 'system',
          content: `You are an expert podcast summarizer. Always respond with valid JSON:
{"insights": ["...", "...", "...", "...", "..."], "highlights": ["...", "...", "..."], "summary": "...", "next_steps": ["...", "...", "..."]}
insights: 5 concise, bold takeaways (one sentence each).
highlights: 3-5 memorable quotes or key statements from the episode.
summary: executive summary of ${words} words.
next_steps: 3 specific, actionable steps the listener should take.${instructions ? `\n\nAdditional focus: ${instructions}` : ''}`,
        },
        {
          role: 'user',
          content: `Summarize this podcast episode titled "${episodeData.title}" from the podcast "${episodeData.podcast}":\n\n${contentForSummary.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.4,
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      title: episodeData.title,
      podcast: episodeData.podcast,
      thumbnail: episodeData.thumbnail || null,
      duration: episodeData.duration || null,
      publishedAt: episodeData.publishedAt || null,
      audioUrl: episodeData.audioUrl || null,
      listenUrl: episodeData.listenUrl || null,
      contentSource,
      summary: parsed.summary || '',
      insights: parsed.insights || [],
      highlights: parsed.highlights || [],
      next_steps: parsed.next_steps || [],
    })
  } catch (err: unknown) {
    console.error('Podcast error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process podcast' },
      { status: 500 }
    )
  }
}
