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

    const { creatorId } = await request.json()

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID required' }, { status: 400 })
    }

    // 1. Fetch Creator details
    const { data: creatorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*, users!inner(full_name)')
      .eq('id', creatorId)
      .single()

    if (profileError || !creatorProfile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Calculate Application Fee (e.g. 10%)
    const priceAmount = creatorProfile.price_base || 0
    if (priceAmount <= 0) {
      return NextResponse.json({ error: 'Invalid creator price' }, { status: 400 })
    }
    
    const feeAmount = Math.floor(priceAmount * 0.10)
    const totalAmount = priceAmount + feeAmount
    
    // 2. Create Order in Supabase
    // Using pending status initially
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: user.id,
        creator_id: creatorId,
        amount: totalAmount,
        status: 'pending'
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Failed to create order' }, { status: 500 })
    }

    // 3. Create Xendit Invoice
    const xenditKey = process.env.XENDIT_SECRET_KEY
    if (!xenditKey) {
       console.error("XENDIT_SECRET_KEY is missing!")
       return NextResponse.json({ error: 'Payment gateway configuration missing' }, { status: 500 })
    }

    const authHeader = `Basic ${Buffer.from(xenditKey + ':').toString('base64')}`
    
    const invoicePayload = {
      external_id: order.id,
      amount: totalAmount,
      description: `Commission Payment for ${creatorProfile.users?.full_name} via Sarena Escrow`,
      invoice_duration: 86400, // 24 hours
      customer: {
        email: user.email
      },
      success_redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=failed`
    }

    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    })

    if (!xenditRes.ok) {
      const errData = await xenditRes.json()
      console.error("Xendit API Error:", errData)
      return NextResponse.json({ error: 'Failed to generate payment link' }, { status: 500 })
    }

    const xenditData = await xenditRes.json()

    // 4. Update the order with Xendit Invoice ID using Service Role to bypass RLS
    // We must use the service role because regular users don't have UPDATE permissions on 'orders'
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )

    const { data: updateData, error: updateError } = await serviceClient
      .from('orders')
      .update({
        xendit_invoice_id: xenditData.id,
        xendit_external_id: xenditData.external_id
      })
      .eq('id', order.id)
      .select()

    if (updateError || !updateData || updateData.length === 0) {
      console.error("Failed to append Invoice ID. RLS might be blocking it or Service Role Key is missing.")
    }

    // 5. Return the payment link
    return NextResponse.json({ checkout_url: xenditData.invoice_url })

  } catch (error) {
    console.error("Checkout route error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
