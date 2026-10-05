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

    const { clients, designers, recipientType, title, brief, amount, revisions } = await request.json()

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. ENFORCE CAPACITY LIMIT ONLY ON DESIGNERS (NOT BUYING CLIENTS)
    if (recipientType === 'invite' && designers && designers.length > 0) {
      for (const designer of designers) {
        const { data: dProfile } = await serviceClient
          .from('users')
          .select('id, full_name, username, is_member')
          .eq('id', designer.id)
          .single()

        const designerIsMember = dProfile?.is_member || false
        const designerLimit = designerIsMember ? 6 : 2

        const { data: dActiveWS } = await serviceClient
          .from('workspaces')
          .select('id')
          .eq('creator_id', designer.id)
          .eq('status', 'escrow')
          .eq('handshake', true)

        const activeCount = dActiveWS ? dActiveWS.length : 0
        if (activeCount >= designerLimit) {
          const designerName = dProfile?.full_name || dProfile?.username || designer.username || 'Desainer tersebut'
          return NextResponse.json({
            error: `${designerName} saat ini sedang menangani kuota maksimal (${designerLimit}) proyek aktif. ${
              designerIsMember 
                ? 'Selesaikan proyek yang sedang berlangsung sebelum menerima proyek baru.' 
                : 'Upgrade ke Sarena Creator Pro untuk dapat menangani hingga 6 proyek sekaligus.'
            }`
          }, { status: 400 })
        }
      }
    }

    if (recipientType === 'invite') {
      if (!clients || clients.length === 0 || !designers || designers.length === 0) {
        return NextResponse.json({ error: 'At least one client and one designer are required' }, { status: 400 })
      }

      const insertPromises = []
      clients.forEach(client => {
        designers.forEach(designer => {
          insertPromises.push(
            serviceClient
              .from('workspaces')
              .insert({
                client_id: client.id,
                creator_id: designer.id,
                created_by: user.id,
                amount: parseInt(amount, 10),
                revisions: parseInt(revisions, 10),
                revisions_used: 0,
                status: 'pending',
                handshake: false,
                brief: brief.trim(),
                title: title.trim()
              })
          )
        })
      })

      await Promise.all(insertPromises)
    } else {
      // Public workspace creation
      const { error: insertError } = await serviceClient
        .from('workspaces')
        .insert({
          client_id: null,
          creator_id: null,
          created_by: user.id,
          amount: parseInt(amount, 10),
          revisions: parseInt(revisions, 10),
          revisions_used: 0,
          status: 'pending',
          handshake: false,
          brief: brief.trim(),
          title: title.trim()
        })

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Workspace creation API error:", error)
    return NextResponse.json({ error: error.message || 'Failed to create workspace' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createdBy, originalTitle, clients, designers, title, brief, amount, revisions } = await request.json()

    // Ensure only host can edit
    if (user.id !== createdBy) {
      return NextResponse.json({ error: 'Forbidden: Only the workspace initiator can edit configuration' }, { status: 403 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. Delete all existing workspaces in the group
    const { error: deleteError } = await serviceClient
      .from('workspaces')
      .delete()
      .eq('created_by', createdBy)
      .eq('title', originalTitle)

    if (deleteError) throw deleteError

    // 2. Insert new workspace rows for all new combinations of clients and designers
    const insertPromises = []
    clients.forEach(client => {
      designers.forEach(designer => {
        insertPromises.push(
          serviceClient
            .from('workspaces')
            .insert({
              client_id: client.id,
              creator_id: designer.id,
              created_by: createdBy,
              amount: parseInt(amount, 10),
              revisions: parseInt(revisions, 10),
              revisions_used: 0,
              status: 'pending',
              handshake: false,
              brief: brief.trim(),
              title: title.trim()
            })
        )
      })
    })

    await Promise.all(insertPromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Workspace update API error:", error)
    return NextResponse.json({ error: error.message || 'Failed to update workspace' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createdBy, title } = await request.json()

    // Ensure only host can delete
    if (user.id !== createdBy) {
      return NextResponse.json({ error: 'Forbidden: Only the workspace initiator can cancel project' }, { status: 403 })
    }

    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    const { error: deleteError } = await serviceClient
      .from('workspaces')
      .delete()
      .eq('created_by', createdBy)
      .eq('title', title)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Workspace cancellation API error:", error)
    return NextResponse.json({ error: error.message || 'Failed to cancel workspace' }, { status: 500 })
  }
}
