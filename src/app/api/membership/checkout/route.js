import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Harap login terlebih dahulu.' }, { status: 401 })
    }

    const amount = 99000
    const orderId = `membership_${user.id}_${Date.now()}`
    const pakasirApiKey = process.env.PAKASIR_API_KEY
    const pakasirSlug = process.env.PAKASIR_SLUG || 'sarena'
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    let checkoutUrl = `${origin}/membership/checkout/simulator?order_id=${orderId}&amount=${amount}`

    if (pakasirApiKey) {
      try {
        console.log(`Registering Pakasir payment for Membership (User: ${user.id}, Amount: ${amount})`)
        const response = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: pakasirSlug,
            order_id: orderId,
            amount: amount,
            api_key: pakasirApiKey
          })
        })
        const resData = await response.json()

        let apiPaymentUrl = null
        if (response.ok && (resData.payment || (resData.status === 'success' && resData.data && resData.data.payment_url))) {
          apiPaymentUrl = resData.data?.payment_url || `https://app.pakasir.com/pay/${pakasirSlug}/${amount}?order_id=${orderId}`
        } else {
          apiPaymentUrl = `https://app.pakasir.com/pay/${pakasirSlug}/${amount}?order_id=${orderId}`
        }

        const redirectTarget = `${origin}/dashboard?membership=success`
        const urlObj = new URL(apiPaymentUrl)
        urlObj.searchParams.set('redirect', redirectTarget)
        checkoutUrl = urlObj.toString()
      } catch (err) {
        console.error("Pakasir API call encountered an error for membership:", err)
        checkoutUrl = `https://app.pakasir.com/pay/${pakasirSlug}/${amount}?order_id=${orderId}&redirect=${origin}/dashboard?membership=success`
      }
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      orderId,
      amount
    })
  } catch (error) {
    console.error("Membership checkout error:", error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
