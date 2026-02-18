import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

interface ContentContext {
  title?: string
  summary?: string
  insights?: string[]
}

interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

async function tavilySearch(query: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 5,
      include_answer: true,
    }),
  })
  if (!res.ok) throw new Error('Tavily search failed')
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const {
      question,
      webSearch = true,
      contentContext,
      history = [],
    }: {
      question: string
      webSearch: boolean
      contentContext?: ContentContext
      history: HistoryMessage[]
    } = await req.json()

    if (!question) return NextResponse.json({ error: 'Question required' }, { status: 400 })

    let searchContext = ''
    const sources: { title: string; url: string }[] = []

    // Tavily web search
    if (webSearch && process.env.TAVILY_API_KEY) {
      try {
        const enrichedQuery = contentContext?.title
          ? `${question} ${contentContext.title}`
          : question
        const results = await tavilySearch(enrichedQuery)

        if (results.answer) searchContext += `Quick answer: ${results.answer}\n\n`
        for (const r of results.results || []) {
          searchContext += `Source: ${r.title}\n${(r.content || '').slice(0, 500)}\n\n`
          sources.push({ title: r.title, url: r.url })
        }
      } catch (e) {
        console.warn('Tavily search failed, continuing without web results:', e)
      }
    }

    // Build content context block
    let contentBlock = ''
    if (contentContext?.title) {
      contentBlock = `\nLoaded content — "${contentContext.title}":`
      if (contentContext.summary) contentBlock += `\nSummary: ${contentContext.summary.slice(0, 800)}`
      if (contentContext.insights?.length) {
        contentBlock += `\nKey insights:\n${contentContext.insights.map((i, n) => `${n + 1}. ${i}`).join('\n')}`
      }
    }

    const systemPrompt = contentContext?.title
      ? `You are a helpful assistant. The user has just read some content and is asking a question about it.
You have access to the content itself${webSearch ? ' AND live web search results' : ''}.
Prioritise answering from the content, but use web results to add context or expand where relevant.
Cite web sources naturally. Be concise (3-5 sentences) unless the user asks for more detail.`
      : `You are a helpful AI research assistant. Answer questions clearly and accurately${webSearch ? ' using the provided web search results' : ''}.
Cite sources naturally. Be concise but thorough. Use markdown for readability.`

    // Build messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    ]

    const contextBlock = searchContext || contentBlock
      ? `\n\n---\nContext:\n${searchContext}${contentBlock}\n---`
      : ''

    messages.push({ role: 'user', content: question + contextBlock })

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources,
    })
  } catch (err: unknown) {
    console.error('Chat error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
