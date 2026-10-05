'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, ShieldCheck, HelpCircle, ChevronRight, AlertTriangle, ExternalLink, Calendar, CreditCard, User, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TransactionDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise)
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [receiptData, setReceiptData] = useState(null)
  const [shared, setShared] = useState(false)

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const loadReceipt = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?next=/transactions/${id}`)
        return
      }

      // 1. Try to fetch as transaction record
      let txRecord = null
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      let targetWorkspaceId = id
      if (txData) {
        txRecord = txData
        targetWorkspaceId = txData.workspace_id
      }

      // 2. Fetch the corresponding workspace context
      const { data: wsData, error: wsError } = await supabase
        .from('workspaces')
        .select(`
          *,
          client:users!client_id (id, full_name, email, username),
          creator:users!creator_id (id, full_name, email, username)
        `)
        .eq('id', targetWorkspaceId)
        .maybeSingle()

      if (wsError || !wsData) {
        throw new Error(wsError?.message || 'Workspace context not found')
      }

      // Verify authorization (must be participant)
      const isClient = wsData.client_id === user.id
      const isCreator = wsData.creator_id === user.id
      const isInitiator = wsData.created_by === user.id
      if (!isClient && !isCreator && !isInitiator) {
        setError('Access Denied: You are not authorized to view this transaction.')
        setLoading(false)
        return
      }

      // If no explicit txRecord was found, try finding one associated with the workspace
      if (!txRecord) {
        const { data: relatedTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('workspace_id', wsData.id)
          .maybeSingle()
        txRecord = relatedTx
      }

      // Calculate fee breakdown (1.7% + Rp 2.000 platform fee)
      const budgetAmount = wsData.amount || 0
      const platformFee = Math.floor(budgetAmount * 0.017) + 2000
      const grandTotal = txRecord?.amount || (budgetAmount + platformFee)

      setReceiptData({
        txId: txRecord?.id || 'virtual_' + wsData.id.slice(0, 8),
        referenceId: txRecord?.reference_id || wsData.id,
        date: txRecord?.created_at || wsData.created_at,
        status: txRecord?.status || (wsData.status === 'pending' ? 'pending' : 'completed'),
        paymentMethod: txRecord?.payment_method || (wsData.status !== 'pending' ? 'qris' : '-'),
        amount: grandTotal,
        budget: budgetAmount,
        fee: platformFee,
        workspaceId: wsData.id,
        workspaceTitle: wsData.title,
        workspaceStatus: wsData.status,
        client: wsData.client,
        creator: wsData.creator,
        rawPayload: txRecord?.raw_payload || null
      })

    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load transaction receipt details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReceipt()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen select-none bg-slate-50 p-6 text-center">
        <div className="space-y-4">
          <div className="w-10 h-10 border-[3px] border-black border-t-accent-lime rounded-full animate-spin mx-auto shadow-brutalist-sm" />
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-black">Printing ledger details...</p>
        </div>
      </div>
    )
  }

  if (error || !receiptData) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-6">
        <div className="bg-accent-orange text-black border-2 border-black p-4 rounded-none shadow-brutalist flex flex-col items-center text-center gap-3">
          <AlertTriangle className="w-8 h-8 text-black shrink-0" />
          <h2 className="text-sm font-black uppercase text-black font-mono">Receipt Loading Error</h2>
          <p className="text-xs font-mono font-semibold">{error || 'Ledger entry does not exist.'}</p>
        </div>
        <Link href="/transactions" className="block text-center">
          <Button variant="outline" className="w-full flex items-center justify-center gap-2 border-2 border-black rounded-none">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Transactions</span>
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8 px-4 pb-12 select-none print:p-0 print:m-0 print:max-w-full">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 print:hidden">
        <Link href="/transactions">
          <Button
            variant="outline"
            className="h-9 px-3 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase hover:bg-slate-50 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
            <span>Back</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-9 px-4 border-2 border-black rounded-none bg-transparent text-black hover:bg-slate-100 shadow-brutalist-xs text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-black" />
            <span>{shared ? 'Copied!' : 'Share'}</span>
          </Button>
          <Button
            onClick={handlePrint}
            className="h-9 px-4 border-2 border-black rounded-none bg-accent-lime text-black hover:bg-accent-lime/90 shadow-brutalist-xs text-xs font-mono font-bold uppercase flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* BRUTALIST PAPER RECEIPT */}
      <div className="bg-white border-[3px] border-black rounded-none shadow-brutalist relative overflow-hidden print:shadow-none print:border-2">
        {/* Top decorative edge */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent-purple" />

        {/* Background Security Watermark (Repeating Purple text rotated -45deg) */}
        <div 
          className="absolute inset-0 pointer-events-none select-none z-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Ctext x='70' y='70' fill='%23a855f7' font-size='32' font-weight='900' font-family='monospace' text-anchor='middle' transform='rotate(-45 70 70)' opacity='0.85'%3ESARENA%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Paid Rubber Stamp (Circular style with curved text and stars) */}
        {receiptData.status === 'completed' && (
          <svg 
            viewBox="0 0 120 120" 
            className="absolute right-4 top-8 md:right-8 md:top-8 w-24 h-24 md:w-28 md:h-28 text-emerald-600 fill-current opacity-85 select-none pointer-events-none z-20 rotate-[-12deg] drop-shadow-[2px_2px_0px_rgba(16,185,129,0.1)]"
          >
            <defs>
              {/* Curve path for top text (clockwise arc) */}
              <path id="textPathTop" d="M 22,60 A 38,38 0 0,1 98,60" fill="none" />
              {/* Curve path for bottom text (counter-clockwise arc so it renders right side up) */}
              <path id="textPathBottom" d="M 22,60 A 38,38 0 0,0 98,60" fill="none" />
            </defs>
            
            {/* Outer Thick/Thin Borders */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" />

            {/* Horizontal Banner Lines */}
            <line x1="24" y1="44" x2="96" y2="44" stroke="currentColor" strokeWidth="1.5" />
            <line x1="24" y1="76" x2="96" y2="76" stroke="currentColor" strokeWidth="1.5" />
            
            {/* Center PAID Stamp text */}
            <text x="60" y="66" textAnchor="middle" fontSize="19" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">PAID</text>
            
            {/* Star Icons */}
            <text x="60" y="38" textAnchor="middle" fontSize="6.5">★★★</text>
            <text x="28" y="62" textAnchor="middle" fontSize="6.5">★</text>
            <text x="92" y="62" textAnchor="middle" fontSize="6.5">★</text>
            
            {/* Top/Bottom Curved Labels */}
            <text fontSize="6.5" fontWeight="bold" fontFamily="monospace" className="tracking-widest">
              <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">SARENA ESCROW</textPath>
            </text>
            <text fontSize="6.5" fontWeight="bold" fontFamily="monospace" className="tracking-widest">
              <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">VERIFIED LEDGER</textPath>
            </text>
          </svg>
        )}
        
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2 border-b-2 border-dashed border-black pb-6">
            <h2 className="text-2xl font-black tracking-tighter uppercase text-black font-mono">
              SARENA<span className="text-[10px] font-black text-accent-purple align-super ml-0.5 font-mono">TM</span>
            </h2>
            <p className="text-[10px] font-mono font-black text-slate-800 uppercase tracking-widest bg-accent-lime/20 border border-black inline-block px-2 py-0.5 shadow-brutalist-xs">
              OFFICIAL LEDGER RECEIPT
            </p>
            <div className="pt-2 font-mono text-[9px] text-slate-500 uppercase">
              <span>Secure Escrow Protection System</span>
            </div>
          </div>

          {/* Core metadata details */}
          <div className="grid grid-cols-2 gap-4 font-mono text-[10px] bg-slate-50 border-2 border-black p-4 shadow-brutalist-xs">
            <div>
              <span className="text-slate-500 block uppercase font-bold">Transaction Ref:</span>
              <span className="text-black font-black uppercase break-all">#{receiptData.referenceId.slice(0, 18)}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold">Receipt Date:</span>
              <span className="text-black font-black uppercase whitespace-nowrap">
                {new Date(receiptData.date).toLocaleDateString()}
                <span className="text-slate-500 font-bold block mt-0.5">
                  {new Date(receiptData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold">Payment Method:</span>
              <span className="text-black font-black uppercase">{receiptData.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-bold">Invoice Status:</span>
              <span className={`inline-block px-1.5 py-0.2 border border-black font-black text-[9px] uppercase shadow-brutalist-xs ${
                receiptData.status === 'completed' ? 'bg-accent-lime text-black' : 'bg-accent-orange text-black'
              }`}>
                {receiptData.status}
              </span>
            </div>
          </div>

          {/* Ledger itemized breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-black border-b border-black pb-1.5 font-mono">
              Ledger Items
            </h3>
            
            <div className="font-mono text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-800">
                <div className="flex flex-col">
                  <span className="font-black uppercase">Project Escrow Deposit</span>
                  <span className="text-[9.5px] text-slate-500 normal-case">For project: "{receiptData.workspaceTitle}"</span>
                </div>
                <span className="font-bold">Rp {receiptData.budget.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between items-center text-slate-800">
                <div className="flex flex-col">
                  <span className="font-black uppercase">Platform Escrow Fee</span>
                  <span className="text-[9.5px] text-slate-500">1.7% + Rp 2.000 standard protection coverage</span>
                </div>
                <span className="font-bold">Rp {receiptData.fee.toLocaleString('id-ID')}</span>
              </div>


              <div className="border-t-2 border-dashed border-black my-4 pt-4 flex justify-between items-center text-black font-black text-sm">
                <span className="uppercase">Grand Total Paid</span>
                <span className="bg-accent-lime px-2 py-0.5 border-2 border-black shadow-brutalist-sm">
                  Rp {receiptData.amount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black pt-6">
            <div className="border-2 border-black p-3.5 bg-white shadow-brutalist-xs flex flex-col justify-between">
              <div>
                <span className="text-[8.5px] font-bold font-mono text-slate-500 uppercase block mb-1.5">Project Client</span>
                <span className="text-xs font-black uppercase text-black leading-tight block">{receiptData.client?.full_name}</span>
                <span className="text-[9.5px] font-mono text-slate-600 block mt-0.5">@{receiptData.client?.username || 'client'}</span>
              </div>
            </div>
            
            <div className="border-2 border-black p-3.5 bg-white shadow-brutalist-xs flex flex-col justify-between">
              <div>
                <span className="text-[8.5px] font-bold font-mono text-slate-500 uppercase block mb-1.5">Assigned Designer</span>
                <span className="text-xs font-black uppercase text-black leading-tight block">{receiptData.creator?.full_name || 'Seeking Designer'}</span>
                <span className="text-[9.5px] font-mono text-slate-600 block mt-0.5">@{receiptData.creator?.username || 'creator'}</span>
              </div>
            </div>
          </div>

          {/* Link back to workspace */}
          <div className="pt-6 border-t-2 border-dashed border-black flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="text-left">
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase block">Workspace Link</span>
              <Link href={`/workspace/${receiptData.workspaceId}`} className="text-xs font-black text-black hover:underline inline-flex items-center gap-1.5">
                <span className="uppercase">{receiptData.workspaceTitle}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
            <Link href={`/workspace/${receiptData.workspaceId}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-10 px-5 text-xs font-mono font-black uppercase bg-white border-2 border-black text-black hover:bg-slate-100 shadow-brutalist-xs active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2">
                <span>Enter Workspace</span>
                <ChevronRight className="w-4 h-4 text-black" />
              </Button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
