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

    const { workspaceId, creatorId, price, revisions, brief, requirementsFileUrl, title } = await request.json()


    let activeCreatorId = creatorId
    let totalAmount = 0
    let workspace = null

    if (workspaceId) {
      // Handle checkout for an existing workspace (e.g. from public openings or invitations)
      const { data: existingWS, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

      if (wsError || !existingWS) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }

      if (existingWS.client_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: You must be the client to pay for this workspace' }, { status: 403 })
      }

      if (!existingWS.creator_id) {
        return NextResponse.json({ error: 'Cannot pay for a workspace that has no designer assigned yet' }, { status: 400 })
      }

      activeCreatorId = existingWS.creator_id
      totalAmount = existingWS.amount
      workspace = { id: existingWS.id }
    } else {
      // Original checkout logic (create new workspace)
      if (!creatorId) {
        return NextResponse.json({ error: 'Creator ID required' }, { status: 400 })
      }

      if (!price || price <= 0) {
        return NextResponse.json({ error: 'Valid workspace price required' }, { status: 400 })
      }

      const platformFee = Math.floor(price * 0.017) + 2000
      totalAmount = price + platformFee
    }

    // 1. Fetch Creator Profile from unified users table
    const { data: creatorProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', activeCreatorId)
      .single()

    if (profileError || !creatorProfile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // 2. ENFORCE WORKSPACE LIMIT RULE: Max 2 active workspaces per designer (or 6 for Pro member)
    const { data: activeWorkspaces, error: countError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('creator_id', activeCreatorId)
      .eq('status', 'escrow')
      .eq('handshake', true)

    if (countError) {
      console.error("Error querying active workspaces:", countError.message)
    }

    const designerLimit = creatorProfile.is_member ? 6 : 2
    if (activeWorkspaces && activeWorkspaces.length >= designerLimit) {
      return NextResponse.json({ 
        error: `${creatorProfile.full_name || 'Desainer'} saat ini sedang menangani kuota maksimal (${designerLimit}) proyek aktif. Silakan tunggu hingga proyek selesai atau hubungi desainer.` 
      }, { status: 400 })
    }

    // 3. Create Workspace in Supabase if not already existing
    if (!workspaceId) {
      const { data: newWS, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          client_id: user.id,
          creator_id: creatorId,
          created_by: user.id,
          amount: totalAmount,
          status: 'pending',
          revisions: revisions || 3,
          revisions_used: 0,
          handshake: false,
          brief: brief || '',
          requirements_file: requirementsFileUrl || null,
          title: title || ''
        })
        .select('id')
        .single()

      if (workspaceError || !newWS) {
        return NextResponse.json({ error: workspaceError?.message || 'Failed to create workspace' }, { status: 500 })
      }
      workspace = newWS
    }

    // 4. Generate Payment Link (Pakasir Live/Sandbox API or local simulator fallback)
    let checkoutUrl = `/checkout/dummy?workspace_id=${workspace.id}&amount=${totalAmount}`
    const pakasirApiKey = process.env.PAKASIR_API_KEY
    const pakasirSlug = process.env.PAKASIR_SLUG || 'sarena'
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (pakasirApiKey) {
      try {
        console.log(`Registering payment with Pakasir for Workspace ${workspace.id} (amount: ${totalAmount})`)
        const response = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: pakasirSlug,
            order_id: workspace.id,
            amount: totalAmount,
            api_key: pakasirApiKey
          })
        })
        const resData = await response.json()
        
        let apiPaymentUrl = null
        if (response.ok && (resData.payment || (resData.status === 'success' && resData.data && resData.data.payment_url))) {
          console.log("Pakasir API transaction registered successfully:", resData)
          apiPaymentUrl = resData.data?.payment_url || `https://app.pakasir.com/pay/${pakasirSlug}/${totalAmount}?order_id=${workspace.id}`
        } else {
          console.warn("Pakasir API response indicates failure or fallback, falling back to redirect format:", resData)
          apiPaymentUrl = `https://app.pakasir.com/pay/${pakasirSlug}/${totalAmount}?order_id=${workspace.id}`
        }

        // Dynamically append or override the redirect parameter
        const redirectTarget = `${origin}/workspace/${workspace.id}?tab=general-chat`
        const urlObj = new URL(apiPaymentUrl)
        urlObj.searchParams.set('redirect', redirectTarget)
        checkoutUrl = urlObj.toString()
      } catch (err) {
        console.error("Pakasir API call encountered an error:", err)
        checkoutUrl = `https://app.pakasir.com/pay/${pakasirSlug}/${totalAmount}?order_id=${workspace.id}&redirect=${origin}/workspace/${workspace.id}?tab=general-chat`
      }
    }

    // 5. Update the workspace with Pakasir details (reusing xendit fields to maintain DB schema compatibility)
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    const { data: updateData, error: updateError } = await serviceClient
      .from('workspaces')
      .update({
        xendit_invoice_id: workspace.id,
        xendit_external_id: `pakasir-${workspace.id}`
      })
      .eq('id', workspace.id)
      .select()

    if (updateError || !updateData || updateData.length === 0) {
      console.error("Failed to append Pakasir info to Workspace. Error:", updateError)
    }

    // 6. Return the payment link
    return NextResponse.json({ checkout_url: checkoutUrl })

  } catch (error) {
    console.error("Checkout route error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
