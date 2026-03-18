import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function AdminEscrowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Security check: Verify the user is an admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center p-8 glass rounded-3xl border border-rose-500/30">
          <h1 className="text-3xl font-bold text-rose-400 mb-4">Access Denied</h1>
          <p className="text-slate-400">You must be an administrator to view this page.</p>
        </div>
      </div>
    )
  }

  // Fetch all orders in escrow
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      client:users!client_id (full_name, email),
      creator:profiles!creator_id (users!inner(full_name, email))
    `)
    .eq('status', 'escrow')
    .order('updated_at', { ascending: false })

  const escrowOrders = orders || []

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Escrow Management</h1>
          <p className="text-slate-400 text-lg">Validate completed work and release funds to creators.</p>
        </div>

        <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-xl font-bold text-white">Pending Escrow Releases</CardTitle>
            <CardDescription>Funds are currently held securely by Sarena via Xendit.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {escrowOrders.length === 0 ? (
               <div className="text-center py-20 text-slate-400">
                 No funds currently held in escrow.
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Creator</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escrowOrders.map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{order.client?.full_name}</p>
                          <p className="text-xs">{order.client?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{order.creator?.users?.full_name}</p>
                          <p className="text-xs">{order.creator?.users?.email}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          Rp {order.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <form action={`/api/admin/release`} method="POST">
                            <input type="hidden" name="orderId" value={order.id} />
                            <Button type="submit" variant="gradient" className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                              Release Funds
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
