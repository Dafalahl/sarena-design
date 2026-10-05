import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const body = await request.json().catch(() => ({}))
    const { senderId, userId } = body

    const targetUserId = user?.id || userId
    if (!targetUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    let query = serviceClient
      .from('workspace_chats')
      .update({ is_read: true })
      .is('workspace_id', null)
      .eq('recipient_id', targetUserId)

    if (senderId) {
      query = query.eq('sender_id', senderId)
    }

    const { data, error } = await query.select('id')

    if (error) {
      console.error("Mark messages as read error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      markedCount: data?.length || 0
    })

  } catch (err) {
    console.error("Inbox read API error:", err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
