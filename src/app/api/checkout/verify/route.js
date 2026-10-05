import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { workspaceId } = await request.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Initialize Supabase Client with service role to bypass RLS policies
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // 1. Fetch the workspace status from the database
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // If already paid or active, return immediately
    if (workspace.status !== 'pending') {
      return NextResponse.json({ 
        success: true, 
        status: workspace.status,
        handshake: workspace.handshake,
        message: 'Workspace is already funded/active.' 
      })
    }

    const pakasirApiKey = process.env.PAKASIR_API_KEY
    const pakasirSlug = process.env.PAKASIR_SLUG || 'sarena'

    if (pakasirApiKey) {
      console.log(`Manually verifying payment with Pakasir API for Workspace: ${workspaceId}`)
      const verifyAmount = workspace.amount || '';
      const verifyUrl = `https://app.pakasir.com/api/transactiondetail?project=${pakasirSlug}&amount=${verifyAmount}&order_id=${workspaceId}&api_key=${pakasirApiKey}`

      try {
        const detailRes = await fetch(verifyUrl, { method: 'GET' })
        const detailData = await detailRes.json()

        const txStatus = detailData.status || detailData.transaction?.status || detailData.payment?.status

        if (detailRes.ok && txStatus === 'completed') {
          console.log(`Payment confirmed via Pakasir API for workspace: ${workspaceId}. Updating status...`)
          
          // Update the workspace status to 'escrow' and handshake to true
          const { data: updatedData, error: updateError } = await supabase
            .from('workspaces')
            .update({ 
              status: 'escrow', 
              handshake: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', workspaceId)
            .select()

          if (updateError) {
            console.error("Error updating workspace during manual verification:", updateError.message)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }

          // Save transaction details to the database
          try {
            const { error: txError } = await supabase
              .from('transactions')
              .insert({
                workspace_id: workspaceId,
                amount: workspace.amount || 0,
                status: 'completed',
                payment_method: detailData?.payment_method || detailData?.payment?.payment_method || 'qris',
                reference_id: workspaceId,
                raw_payload: detailData
              })

            if (txError) {
              console.error("Failed to log transaction details to table during manual verification:", txError.message)
            } else {
              console.log(`Successfully recorded transaction details for workspace ${workspaceId} during manual verification`)
            }
          } catch (txException) {
            console.error("Exception recording transaction during manual verification:", txException)
          }

          // Insert onboarding greetings into general chat
          try {
            const workspaceInfo = updatedData?.[0] || workspace
            if (workspaceInfo) {
              const clientGreetings = [
                "Hello! Excited to start this project. Let me know if you need anything from my side.",
                "Hi there! Let's build something awesome.",
                "Hey! Looking forward to working together on this project.",
                "Hello! The project is funded. Let's make this design look amazing!"
              ]
              const designerGreetings = [
                "Hi! Thanks for the hire, excited to work with you on this.",
                "Hello! Ready to jump in. I will start sketching concepts soon.",
                "Hey! Thrilled to design this project. I'll post updates here.",
                "Hi! Thanks for funding the workspace. Let's create some magic."
              ]

              const randomClientMsg = clientGreetings[Math.floor(Math.random() * clientGreetings.length)]
              const randomDesignerMsg = designerGreetings[Math.floor(Math.random() * designerGreetings.length)]

              if (workspaceInfo.client_id) {
                await supabase
                  .from('workspace_chats')
                  .insert({
                    workspace_id: workspaceId,
                    sender_id: workspaceInfo.client_id,
                    channel_type: 'general',
                    message: randomClientMsg
                  })
              }

              if (workspaceInfo.creator_id) {
                await supabase
                  .from('workspace_chats')
                  .insert({
                    workspace_id: workspaceId,
                    sender_id: workspaceInfo.creator_id,
                    channel_type: 'general',
                    message: randomDesignerMsg
                  })
              }
              console.log(`Successfully sent welcome greetings to general chat for workspace ${workspaceId} during manual verification`)
            }
          } catch (greetingException) {
            console.error("Failed to send welcome greetings during manual verification:", greetingException)
          }



          return NextResponse.json({
            success: true,
            status: 'escrow',
            handshake: true,
            message: 'Payment verified and workspace unlocked successfully!'
          })
        }
      } catch (err) {
        console.error("Error calling Pakasir verification API:", err)
        return NextResponse.json({ error: 'Failed to verify transaction with Pakasir API' }, { status: 500 })
      }
    }

    // If not paid yet, return pending status
    return NextResponse.json({
      success: false,
      status: 'pending',
      handshake: workspace.handshake,
      message: 'Payment is still pending verification.'
    })

  } catch (error) {
    console.error("Verification endpoint error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
