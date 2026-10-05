import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, reason } = await request.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. Fetch workspace
    const { data: workspace, error: wsError } = await serviceClient
      .from('workspaces')
      .select('*, creator:users!creator_id(full_name, username), client:users!client_id(full_name, username)')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace tidak ditemukan' }, { status: 404 })
    }

    // 2. Ensure caller is a participant or initiator
    const isParticipant = 
      workspace.creator_id === user.id || 
      workspace.client_id === user.id || 
      workspace.created_by === user.id

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden: Anda bukan partisipan dalam workspace ini' }, { status: 403 })
    }

    // Determine the other party to notify
    let otherPartyId = null
    let userRole = 'Pengguna'

    if (user.id === workspace.creator_id) {
      userRole = 'Desainer'
      otherPartyId = workspace.client_id || workspace.created_by
    } else {
      userRole = 'Klien'
      otherPartyId = workspace.creator_id
    }

    const projectName = workspace.title || 'Proyek Desain'

    // Determine sender display name
    const senderName = userRole === 'Desainer'
      ? (workspace.creator?.full_name || (workspace.creator?.username ? `@${workspace.creator.username}` : 'Desainer'))
      : (workspace.client?.full_name || (workspace.client?.username ? `@${workspace.client.username}` : 'Klien'))

    // 3. Send notification message to other party's inbox
    if (otherPartyId && otherPartyId !== user.id) {
      try {
        const rejectionNotice = `🚫 PEMBERITAHUAN: Tawaran proyek "${projectName}" tidak jadi dibuat.\n\nProyek ini telah ${userRole === 'Klien' ? `dibatalkan oleh Klien (${senderName})` : `ditolak oleh Desainer (${senderName})`}${reason ? ` dengan alasan: "${reason}"` : ''}. Workspace ini tidak akan dilanjutkan.`

        await serviceClient.from('workspace_chats').insert({
          workspace_id: null,
          channel_type: 'inquiry',
          sender_id: user.id,
          recipient_id: otherPartyId,
          is_read: false,
          message: rejectionNotice
        })
        console.log(`Rejection notification inbox message sent to ${otherPartyId} from ${userRole} (${user.id})`)
      } catch (chatErr) {
        console.warn("Failed to send rejection notification chat:", chatErr)
      }
    }

    // 4. Update workspace status to 'refunded' (rejected) instead of hard-deleting,
    // so both parties can see clear feedback and reason
    const { error: updateError } = await serviceClient
      .from('workspaces')
      .update({
        status: 'refunded',
        handshake: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspaceId)

    if (updateError) {
      console.error("Update workspace to refunded error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Undangan/tawaran proyek telah berhasil ditolak/dibatalkan.'
    })

  } catch (err) {
    console.error("Reject API error:", err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
