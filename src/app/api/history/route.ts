import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — fetch all summaries, newest first
export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('summaries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('History GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

// POST — save a new summary
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, url, podcast_name, summary, insights, highlights, next_steps } = body

    if (!type || !title || !summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('summaries')
      .insert({ type, title, url: url || null, podcast_name: podcast_name || null, summary, insights: insights || [], highlights: highlights || [], next_steps: next_steps || [] })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('History POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    )
  }
}

// DELETE — remove a summary by id
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await getSupabase()
      .from('summaries')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('History DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete' },
      { status: 500 }
    )
  }
}
