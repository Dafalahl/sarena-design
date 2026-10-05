import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 })
    }

    const { creatorId, price, revisions, brief, requirementsFileUrl, title } = await request.json()

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID wajib diisi' }, { status: 400 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul proyek wajib diisi' }, { status: 400 })
    }

    if (!brief || !brief.trim()) {
      return NextResponse.json({ error: 'Brief proyek wajib diisi' }, { status: 400 })
    }

    const numericPrice = parseInt(price, 10)
    if (!numericPrice || numericPrice <= 0) {
      return NextResponse.json({ error: 'Nominal harga proyek tidak valid' }, { status: 400 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. Fetch Creator Profile to check capacity
    const { data: creatorProfile, error: profileError } = await serviceClient
      .from('users')
      .select('id, full_name, username, is_member')
      .eq('id', creatorId)
      .single()

    if (profileError || !creatorProfile) {
      return NextResponse.json({ error: 'Desainer tidak ditemukan' }, { status: 404 })
    }

    const designerLimit = creatorProfile.is_member ? 6 : 2
    const { data: activeWorkspaces } = await serviceClient
      .from('workspaces')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('status', 'escrow')
      .eq('handshake', true)

    if (activeWorkspaces && activeWorkspaces.length >= designerLimit) {
      return NextResponse.json({
        error: `${creatorProfile.full_name || creatorProfile.username || 'Desainer'} saat ini sedang menangani kuota maksimal (${designerLimit}) proyek aktif.`
      }, { status: 400 })
    }

    // 2. Calculate platform fee & total
    const platformFee = Math.floor(numericPrice * 0.017) + 2000
    const totalAmount = numericPrice + platformFee

    // 3. Create workspace with pending status and handshake = false (awaiting designer agreement)
    const { data: newWS, error: wsError } = await serviceClient
      .from('workspaces')
      .insert({
        client_id: user.id,
        creator_id: creatorId,
        created_by: user.id,
        amount: totalAmount,
        revisions: parseInt(revisions, 10) || 3,
        revisions_used: 0,
        status: 'pending',
        handshake: false,
        brief: brief.trim(),
        title: title.trim(),
        requirements_file: requirementsFileUrl || null
      })
      .select()
      .single()

    if (wsError || !newWS) {
      console.error("Failed to create workspace proposal:", wsError)
      return NextResponse.json({ error: wsError?.message || 'Gagal membuat proposal workspace' }, { status: 500 })
    }

    // 4. Send automated inquiry chat message to designer inbox
    try {
      const clientName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Klien'
      await serviceClient.from('workspace_chats').insert({
        workspace_id: null,
        channel_type: 'inquiry',
        sender_id: user.id,
        recipient_id: creatorId,
        message: `📋 Permintaan Proyek Baru: "${title.trim()}" (Rp ${numericPrice.toLocaleString('id-ID')}).\n\nHalo! Saya telah mengajukan permintaan pengerjaan proyek. Silakan tinjau brief dan klik "Terima Proyek" di workspace:\n/workspace/${newWS.id}`
      })
    } catch (chatErr) {
      console.warn("Failed to send automated proposal chat notification:", chatErr)
    }

    return NextResponse.json({
      success: true,
      workspaceId: newWS.id
    })

  } catch (err) {
    console.error("Proposal API error:", err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
