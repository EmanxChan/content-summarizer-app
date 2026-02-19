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

function isXUrl(url: string) {
  return url.includes('x.com/') || url.includes('twitter.com/')
}

async function extractWithJina(url: string): Promise<{ title: string; content: string }> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      Accept: 'text/plain',
      'X-Return-Format': 'markdown',
    },
  })
  if (!res.ok) throw new Error(`Jina extract failed: ${res.status}`)
  const text = await res.text()

  // Jina returns: "Title: ...\nURL Source: ...\nMarkdown Content:\n..."
  const titleMatch = text.match(/^Title:\s*(.+)/m)
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname
  const contentStart = text.indexOf('Markdown Content:')
  const content = contentStart !== -1 ? text.slice(contentStart + 17).trim() : text

  return { title, content }
}

async function extractWithTavily(url: string): Promise<{ title: string; content: string }> {
  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ urls: [url] }),
  })

  if (!res.ok) throw new Error(`Tavily extract failed: ${res.status}`)
  const data = await res.json()

  const result = data.results?.[0]
  if (!result) throw new Error('No content extracted')

  return {
    title: result.title || new URL(url).hostname,
    content: result.raw_content || result.text || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, words = 300, instructions = '' } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    // X/Twitter needs Jina (has auth bypass); everything else uses Tavily
    const { title, content } = isXUrl(url)
      ? await extractWithJina(url)
      : await extractWithTavily(url)

    if (!content || content.length < 100) {
      return NextResponse.json({ error: 'Could not extract article content' }, { status: 422 })
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
