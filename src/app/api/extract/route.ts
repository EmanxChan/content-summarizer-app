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
const JINA_API_KEY = () => process.env.JINA_API_KEY

async function extractWithJina(url: string): Promise<{ title: string; content: string }> {
  const headers: Record<string, string> = {
    Accept: 'text/plain',
    'X-Return-Format': 'markdown',
  }
  const apiKey = JINA_API_KEY()
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const res = await fetch(`https://r.jina.ai/${url}`, { headers })
  if (!res.ok) throw new Error(`Jina extract failed: ${res.status}`)

  const text = await res.text()
  // Jina returns: "Title: ...\nURL Source: ...\nMarkdown Content:\n..."
  const titleMatch = text.match(/^Title:\s*(.+)/m)
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname
  const contentStart = text.indexOf('Markdown Content:')
  const content = contentStart !== -1 ? text.slice(contentStart + 17).trim() : text

  return { title, content }
}

export async function POST(req: NextRequest) {
  try {
    const { url, words = 300, instructions = '' } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // Use Jina for all URLs (X/Twitter, Substack, news, etc.)
    const { title, content } = await extractWithJina(url)

    if (!content || content.length < 100) {
      return NextResponse.json(
        { error: 'Could not extract article content. The site may be blocking extraction.' },
        { status: 422 }
      )
    }

    // Summarize with Groq
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
          content: `Summarize this article titled "${title}":\n\n${content.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.4,
    })

    const raw = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(raw)

    return NextResponse.json({
      title,
      summary: parsed.summary || '',
      insights: parsed.insights || [],
      highlights: parsed.highlights || [],
      next_steps: parsed.next_steps || [],
    })
  } catch (err: unknown) {
    console.error('Extract error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract' },
      { status: 500 }
    )
  }
}
