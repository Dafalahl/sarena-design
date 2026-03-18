import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Security check: Verify the user is an admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const orderId = formData.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // In a real production app, this is where you would call Xendit's Disbursements/Payout API
    // Or call your internal treasury service to release the funds.
    // For this MVP, we consider the escrow "released" in the database.

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'released', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'escrow') // Only release if it's currently in escrow

    if (updateError) {
      console.error("Error releasing escrow:", updateError.message)
      return NextResponse.json({ error: 'Failed to release funds' }, { status: 500 })
    }

    // Redirect back to the admin dashboard
    return NextResponse.redirect(new URL('/admin/escrow', request.url), { status: 303 })
  } catch (error) {
    console.error("Release route error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
