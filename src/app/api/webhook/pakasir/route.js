import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Next.js Webhook handler for Pakasir callbacks
export async function POST(request) {
  try {
    const payload = await request.json()

    // Pakasir sends status = 'completed' when transaction completes successfully
    if (payload.status === 'completed') {
      const orderId = payload.order_id
      
      if (!orderId) {
        return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
      }

      // Webhook validation to prevent spoofing if PAKASIR_API_KEY is configured
      const pakasirApiKey = process.env.PAKASIR_API_KEY
      const pakasirSlug = process.env.PAKASIR_SLUG || 'sarena'
      const isSimulator = payload.payment_method === 'qris_simulator'

      if (pakasirApiKey && !isSimulator) {
        try {
          console.log(`Verifying Webhook status directly with Pakasir for order: ${orderId}`)
          const verifyAmount = payload.amount || '';
          const verifyUrl = `https://app.pakasir.com/api/transactiondetail?project=${pakasirSlug}&amount=${verifyAmount}&order_id=${orderId}&api_key=${pakasirApiKey}`
          
          const detailRes = await fetch(verifyUrl, {
            method: 'GET'
          })
          const detailData = await detailRes.json()
          
          // Verify status in either detailData.status, detailData.transaction?.status, or detailData.payment?.status
          const txStatus = detailData.status || detailData.transaction?.status || detailData.payment?.status
          
          if (!detailRes.ok || txStatus !== 'completed') {
            console.error("CRITICAL: Webhook verification failed! Pakasir API response:", detailData)
            return NextResponse.json({ error: 'Webhook payload verification failed' }, { status: 400 })
          }
          console.log(`Webhook verified successfully via Pakasir API for order: ${orderId}`)
        } catch (verifyError) {
          console.error("Error verifying Pakasir webhook transaction:", verifyError)
          return NextResponse.json({ error: 'Verification request failed' }, { status: 500 })
        }
      }

      // Initialize Supabase Client with service role to bypass RLS policies
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!serviceRoleKey) {
        console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Webhook cannot bypass RLS.")
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
          }
        }
      )

      // Check if this is a membership payment
      if (orderId.startsWith('membership_') || orderId.startsWith('mem_')) {
        const parts = orderId.split('_')
        const userId = parts[1]

        if (!userId) {
          console.error("Missing userId in membership order_id:", orderId)
          return NextResponse.json({ error: 'Missing userId in membership order_id' }, { status: 400 })
        }

        const { data: updatedUser, error: userError } = await supabase
          .from('users')
          .update({ is_member: true })
          .eq('id', userId)
          .select('id, email, is_member')

        if (userError) {
          console.error("Error activating membership via Pakasir:", userError.message)
          return NextResponse.json({ error: userError.message }, { status: 500 })
        }

        console.log(`Successfully activated Creator Pro for user ${userId} via Pakasir webhook!`, updatedUser)
        return NextResponse.json({ success: true, message: 'Creator Pro membership activated successfully' })
      }

      // Update the workspace status to 'escrow' and handshake to true
      const { data, error } = await supabase
        .from('workspaces')
        .update({ 
          status: 'escrow', 
          handshake: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)
        .select()

      if (error) {
        console.error("Error updating workspace status via Pakasir:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      } else if (!data || data.length === 0) {
        console.warn(`No pending workspace found for order ID: ${orderId}`)
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      } else {
        console.log(`Successfully updated workspace ${orderId} to Escrow status via Pakasir webhook!`)

        // Save transaction details to the database
        try {
          const { error: txError } = await supabase
            .from('transactions')
            .insert({
              workspace_id: orderId,
              amount: payload.amount || data[0].amount || 0,
              status: 'completed',
              payment_method: payload.payment_method || 'qris',
              reference_id: payload.order_id || orderId,
              raw_payload: payload
            })

          if (txError) {
            console.error("Failed to log transaction details to table:", txError.message)
          } else {
            console.log(`Successfully recorded transaction details for workspace ${orderId}`)
          }
        } catch (txException) {
          console.error("Exception recording transaction:", txException)
        }

        // Insert onboarding greetings into general chat
        try {
          const workspaceInfo = data[0]
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
                  workspace_id: orderId,
                  sender_id: workspaceInfo.client_id,
                  channel_type: 'general',
                  message: randomClientMsg
                })
            }

            if (workspaceInfo.creator_id) {
              await supabase
                .from('workspace_chats')
                .insert({
                  workspace_id: orderId,
                  sender_id: workspaceInfo.creator_id,
                  channel_type: 'general',
                  message: randomDesignerMsg
                })
            }
            console.log(`Successfully sent welcome greetings to general chat for workspace ${orderId}`)
          }
        } catch (greetingException) {
          console.error("Failed to send welcome greetings:", greetingException)
        }
      }


    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
     console.error("Pakasir Webhook processing error:", error)
     return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
