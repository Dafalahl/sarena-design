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

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // 1. Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('client_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'negotiating') {
      return NextResponse.json({ error: 'Order is not in negotiating status' }, { status: 400 })
    }

    if (!order.amount || order.amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 })
    }

    // 2. Buat Xendit Invoice
    const xenditKey = process.env.XENDIT_SECRET_KEY
    if (!xenditKey) {
      return NextResponse.json({ error: 'Payment gateway configuration missing' }, { status: 500 })
    }

    const authHeader = `Basic ${Buffer.from(xenditKey + ':').toString('base64')}`

    const invoicePayload = {
      external_id: order.id,
      amount: order.amount,
      description: `Pembayaran order: ${order.title}`,
      invoice_duration: 86400, // 24 jam
      customer: {
        email: user.email
      },
      success_redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders?payment=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders?payment=failed`
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

    // 3. Update order dengan Xendit Invoice ID
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    await serviceClient
      .from('orders')
      .update({
        xendit_invoice_id: xenditData.id,
        xendit_external_id: xenditData.external_id
      })
      .eq('id', order.id)

    // 4. Return payment link
    return NextResponse.json({ checkout_url: xenditData.invoice_url })

  } catch (error) {
    console.error("Checkout route error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}