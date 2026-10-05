'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, ArrowUpRight, HelpCircle, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ReloadButton from '@/components/ReloadButton'

export default function TransactionsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workspacesWithTx, setWorkspacesWithTx] = useState([])
  const [error, setError] = useState(null)

  const fetchTransactions = async (userId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select(`
          id,
          title,
          amount,
          status,
          created_at,
          client:users!client_id (id, full_name, username, email),
          creator:users!creator_id (id, full_name, username, email),
          transactions (*)
        `)
        .or(`client_id.eq.${userId},creator_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Flatten list to get workspaces that either have transactions logged,
      // or are currently in 'escrow' / 'released' (implying a transaction occurred)
      const list = (data || []).map(ws => {
        // Find transaction record or generate a virtual one if missing (to support older or test data)
        const dbTx = ws.transactions && ws.transactions[0]
        return {
          workspaceId: ws.id,
          title: ws.title,
          client: ws.client,
          creator: ws.creator,
          workspaceStatus: ws.status,
          createdAt: dbTx?.created_at || ws.created_at,
          amount: dbTx?.amount || ws.amount,
          status: dbTx?.status || (ws.status === 'pending' ? 'pending' : 'completed'),
          paymentMethod: dbTx?.payment_method || (ws.status !== 'pending' ? 'qris' : '-'),
          referenceId: dbTx?.reference_id || ws.id,
          txId: dbTx?.id || null
        }
      })

      setWorkspacesWithTx(list)
    } catch (err) {
      console.error('Error fetching transaction records:', err)
      setError('Failed to retrieve transactions history. Please try again.')
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/transactions')
        return
      }
      setCurrentUser(user)
      await fetchTransactions(user.id)
    } catch (err) {
      console.error(err)
      setError('An error occurred loading session.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Setup real-time updates for transactions and workspaces
  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel(`transactions-realtime-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        () => fetchTransactions(currentUser.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchTransactions(currentUser.id)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] select-none bg-slate-50 p-6 text-center">
        <div className="space-y-4">
          <div className="w-10 h-10 border-[3px] border-black border-t-accent-lime rounded-full animate-spin mx-auto shadow-brutalist-sm" />
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-black">Syncing ledger records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 text-black">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            Financial Ledger
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
            Transactions
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">Review your workspace payment records, escrow states, and ledger reference IDs.</p>
        </div>
      </header>

      {error && (
        <div className="bg-accent-orange text-black border-2 border-black p-3 rounded-none text-xs font-mono font-bold shadow-brutalist-sm flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main card */}
      <Card className="bg-white border-2 border-black rounded-none overflow-hidden shadow-brutalist flex flex-col">
        <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="font-black text-black uppercase text-sm sm:text-base">Ledger Logs</CardTitle>
            <CardDescription className="text-slate-600 text-xs font-semibold">Verify verified invoice codes and transaction modes.</CardDescription>
          </div>
          <ReloadButton onClick={() => fetchTransactions(currentUser?.id)} />
        </CardHeader>

        <CardContent className="p-6 bg-white">
          {workspacesWithTx.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-6 select-none">
              <div className="w-16 h-16 border-2 border-black bg-slate-50 flex items-center justify-center mx-auto shadow-brutalist-sm">
                <CreditCard className="w-7 h-7 text-black animate-pulse" />
              </div>
              <p className="text-black text-sm max-w-sm mx-auto font-bold uppercase tracking-wide">
                No transactions recorded yet. Fund a pending workspace project to start logging financial details.
              </p>
              <div className="flex justify-center">
                <Link href="/dashboard">
                  <Button variant="default" className="flex items-center gap-2">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-black rounded-none shadow-brutalist-sm">
              <table className="w-full text-left border-collapse min-w-[700px] font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-black font-black uppercase text-slate-800 tracking-wider">
                    <th className="p-3.5 border-r-2 border-black">Transaction ID / Ref</th>
                    <th className="p-3.5 border-r-2 border-black">Workspace / Project</th>
                    <th className="p-3.5 border-r-2 border-black">Type</th>
                    <th className="p-3.5 border-r-2 border-black">Date</th>
                    <th className="p-3.5 border-r-2 border-black">Method</th>
                    <th className="p-3.5 border-r-2 border-black text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-black">
                  {workspacesWithTx.map((tx, idx) => {
                    const isClient = currentUser && tx.client?.id === currentUser.id
                    const roleLabel = isClient ? 'Sender' : 'Recipient'
                    
                    let statusBadge = 'bg-white text-slate-500 border-dashed border-black'
                    if (tx.status === 'completed') {
                      statusBadge = 'bg-accent-lime text-black border-black shadow-brutalist-xs'
                    } else if (tx.status === 'failed') {
                      statusBadge = 'bg-accent-orange text-black border-black shadow-brutalist-xs'
                    }

                    return (
                      <tr key={tx.workspaceId + idx} className="hover:bg-slate-50/50 transition-colors">
                        {/* Ref ID */}
                        <td className="p-3.5 border-r-2 border-black font-semibold max-w-[150px] truncate">
                          <Link href={`/transactions/${tx.txId || tx.workspaceId}`} className="hover:underline block group">
                            <span className="text-[10px] font-black text-black group-hover:text-accent-purple block">#{tx.referenceId.slice(0, 8)}</span>
                            <span className="text-[9px] text-slate-500 block font-normal mt-0.5 truncate">{tx.txId ? `tx_${tx.txId.slice(0, 6)}` : 'view_receipt'}</span>
                          </Link>
                        </td>
                        
                        {/* Workspace Title */}
                        <td className="p-3.5 border-r-2 border-black font-black uppercase max-w-[200px] truncate">
                          <Link href={`/workspace/${tx.workspaceId}`} className="hover:underline flex items-center gap-1.5 text-black">
                            <span className="truncate">{tx.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-500 hover:text-black" />
                          </Link>
                          <span className="text-[9px] font-normal font-sans text-slate-500 block mt-0.5 normal-case">
                            {isClient ? `To Designer: @${tx.creator?.username || 'user'}` : `From Client: @${tx.client?.username || 'user'}`}
                          </span>
                        </td>
                        
                        {/* User Role Type */}
                        <td className="p-3.5 border-r-2 border-black font-bold uppercase text-[10px]">
                          <span className={`inline-block px-1.5 py-0.5 border border-black ${isClient ? 'bg-accent-orange/10 text-accent-orange' : 'bg-accent-purple/10 text-accent-purple'}`}>
                            {roleLabel}
                          </span>
                        </td>
                        
                        {/* Date */}
                        <td className="p-3.5 border-r-2 border-black text-slate-600 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        
                        {/* Payment Method */}
                        <td className="p-3.5 border-r-2 border-black font-bold uppercase text-[10px]">
                          {tx.paymentMethod}
                        </td>
                        
                        {/* Amount */}
                        <td className="p-3.5 border-r-2 border-black font-black text-right whitespace-nowrap">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </td>
                        
                        {/* Status */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className={`inline-block text-[9.5px] font-black font-mono uppercase px-2.5 py-0.5 border ${statusBadge}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
