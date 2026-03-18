'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CheckoutPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processingState, setProcessingState] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadCheckout() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/order/' + id)
        return
      }

      // Fetch the creator being hired
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          users!inner ( full_name, avatar_url )
        `)
        .eq('username', id)
        .single()

      if (error || !data) {
        setError("Creator not found.")
        setLoading(false)
        return
      }

      setCreator(data)
      setLoading(false)
    }
    loadCheckout()
  }, [id, router])

  const handleCheckout = async () => {
    setProcessingState('Creating Order...')
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creator.id })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      setProcessingState('Redirecting to Xendit...')
      window.location.href = data.checkout_url
    } catch (err) {
      console.error(err)
      setError(err.message)
      setProcessingState(null)
    }
  }

  if (loading) return <div className="text-center py-24 text-slate-400">Loading secure checkout...</div>
  if (error && !creator) return <div className="text-center py-24 text-rose-400">{error}</div>

  const fee = creator.price_base * 0.1
  const total = creator.price_base + fee

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400 mb-3">
          Secure Escrow Checkout
        </h1>
        <p className="text-slate-400 text-lg">
          Your payment will be held securely until you approve the final delivery from the creator.
        </p>
      </div>

      <Card className="glass rounded-3xl border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/[0.02] p-8">
          <CardTitle className="text-xl text-white">Order Summary</CardTitle>
          <CardDescription>Review the details of your commission request.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center space-x-6 bg-slate-800/50 p-6 rounded-2xl border border-white/5">
             <img 
                src={creator.users?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.username}`}
                className="w-20 h-20 rounded-xl object-cover" 
                alt="Creator Avatar" 
             />
             <div>
                <p className="text-sm text-slate-400 mb-1">Hiring Creator</p>
                <h3 className="text-xl font-bold text-white">{creator.users?.full_name}</h3>
                <p className="text-indigo-400 text-sm mt-1">@{creator.username}</p>
             </div>
          </div>

          <div className="space-y-4 pt-4">
             <div className="flex justify-between items-center text-slate-300">
                <span>Base Commission Rate</span>
                <span>Rp {creator.price_base.toLocaleString('id-ID')}</span>
             </div>
             <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>Sarena Escrow Fee (10%)</span>
                <span>Rp {fee.toLocaleString('id-ID')}</span>
             </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="flex justify-between items-center text-white font-bold text-xl">
             <span>Total to Pay</span>
             <span className="text-rose-400">Rp {total.toLocaleString('id-ID')}</span>
          </div>

          <div className="pt-6">
            <Button 
              onClick={handleCheckout} 
              variant="gradient" 
              className="w-full text-lg h-14 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all font-bold"
              disabled={processingState !== null}
            >
              {processingState || 'Proceed to Payment (Xendit)'}
            </Button>
            <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Payment legally secured by Sarena Escrow
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
