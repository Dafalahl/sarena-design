'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function DummyCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspaceId = searchParams.get('workspace_id')
  const amountStr = searchParams.get('amount')

  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!workspaceId) {
      setError("Workspace ID is missing.")
      setLoading(false)
      return
    }

    async function loadWorkspace() {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

      if (error || !data) {
        setError("Workspace not found.")
      } else {
        setWorkspace(data)
      }
      setLoading(false)
    }

    loadWorkspace()
  }, [workspaceId])

  const handleSimulatePayment = async () => {
    setPaying(true)
    setError(null)

    try {
      // Trigger the Pakasir webhook endpoint
      const res = await fetch('/api/webhook/pakasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          order_id: workspaceId,
          amount: workspace ? workspace.amount : parseInt(amountStr || '0', 10),
          project: 'sarena',
          payment_method: 'qris_simulator'
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Webhook execution failed.")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/workspace/${workspaceId}?tab=general-chat`)
      }, 2000)
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to process simulation webhook.")
      setPaying(false)
    }
  }

  // Automatically trigger payment simulation after workspace loads
  useEffect(() => {
    if (workspace && !success && !paying && !error) {
      const timer = setTimeout(() => {
        handleSimulatePayment()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [workspace, success, paying, error])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-black">
        <div className="font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
          Initializing Pakasir Sandbox...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-black">
      <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden">
        <CardHeader className="border-b-2 border-black bg-accent-yellow p-5">
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-2 shadow-brutalist-sm text-black">
            SANDBOX ENVIRONMENT
          </div>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-black flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Pakasir Simulator
          </CardTitle>
          <CardDescription className="text-black font-semibold text-xs mt-1">
            Simulate a secure transaction without real currency.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {error && (
            <div className="border-2 border-black bg-accent-orange p-3 text-xs font-bold uppercase tracking-wide font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="border-2 border-black bg-accent-lime p-5 text-center space-y-3 shadow-brutalist-sm">
              <CheckCircle2 className="w-8 h-8 text-black mx-auto animate-bounce" />
              <h3 className="text-sm font-black uppercase">Payment Successful!</h3>
              <p className="text-[10px] font-semibold text-slate-700">Webhook processed, workspace unlocked. Redirecting back...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 border-2 border-black p-4 bg-[#FAF9F6] shadow-brutalist-sm font-mono text-xs">
                <div className="flex justify-between border-b border-black/10 pb-2">
                  <span className="text-slate-500 uppercase font-bold">Workspace:</span>
                  <span className="font-black text-black text-right truncate max-w-[180px]">
                    {workspace ? workspace.title : 'Project Deposit'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-2">
                  <span className="text-slate-500 uppercase font-bold">Order ID:</span>
                  <span className="font-bold text-black text-right select-all">
                    {workspaceId}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 uppercase font-bold">Billing Amount:</span>
                  <span className="font-black text-black bg-white border border-black px-1.5">
                    Rp {parseInt(amountStr || (workspace ? workspace.amount : 0), 10).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border-2 border-black p-4 text-[10px] font-semibold leading-relaxed text-slate-600">
                <p className="font-bold text-black uppercase mb-1">Sandbox Notice</p>
                <p>Clicking the button below simulates a successful payment response callback from Pakasir.com. This executes the webhook route, registers the deposit in escrow, and unlocks design collaboration immediately.</p>
              </div>

              <Button
                onClick={handleSimulatePayment}
                disabled={paying}
                className="w-full h-12 text-xs uppercase tracking-widest font-black bg-accent-lime border-2 border-black text-black hover:bg-emerald-400 transition-all shadow-brutalist active:translate-y-0.5 active:shadow-brutalist-sm"
              >
                {paying ? 'Processing Sandbox Webhook...' : 'Simulate Successful Payment'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
