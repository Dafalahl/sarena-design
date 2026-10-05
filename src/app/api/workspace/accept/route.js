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

    const { workspaceId } = await request.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. Fetch workspace details
    const { data: workspace, error: wsError } = await serviceClient
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace tidak ditemukan' }, { status: 404 })
    }

    // 2. Ensure caller is an invitee (creator_id or client_id), but NOT the initiator (created_by)
    const isInvitee = workspace.creator_id === user.id || workspace.client_id === user.id
    const isInitiator = workspace.created_by === user.id
    if (!isInvitee || isInitiator) {
      return NextResponse.json({ error: 'Forbidden: Hanya pihak yang diundang yang dapat menerima proyek ini' }, { status: 403 })
    }

    // 3. Update handshake to true (acceptance confirmed)
    const { error: updateError } = await serviceClient
      .from('workspaces')
      .update({
        handshake: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspaceId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Send notification to initiator about acceptance
    try {
      const { data: acceptorProfile } = await serviceClient
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single()

      const acceptorName = acceptorProfile?.full_name || acceptorProfile?.username || 'Pihak yang Diundang'
      const notifRecipient = workspace.created_by
      const isDesignerAccepting = workspace.creator_id === user.id

      const notifMessage = isDesignerAccepting
        ? `Kabar baik! ${acceptorName} (Desainer) telah menyetujui tawaran proyek "${workspace.title}".\n\nSilakan selesaikan pembayaran Escrow agar pengerjaan dapat langsung dimulai:\n/workspace/${workspace.id}`
        : `${acceptorName} telah menerima undangan untuk bergabung ke proyek "${workspace.title}".\n\nWorkspace akan segera aktif setelah semua pihak menyetujui:\n/workspace/${workspace.id}`

      await serviceClient.from('workspace_chats').insert({
        workspace_id: null,
        channel_type: 'inquiry',
        sender_id: user.id,
        recipient_id: notifRecipient,
        message: notifMessage
      })
    } catch (chatErr) {
      console.warn("Failed to send acceptance notification chat:", chatErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Undangan berhasil diterima! Notifikasi telah dikirim.'
    })

  } catch (err) {
    console.error("Accept API error:", err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
