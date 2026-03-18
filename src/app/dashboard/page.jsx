import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user data from the core users table created by our trigger
  const { data: userData, error } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Fetch creator profile if they have set one up
  const { data: creatorProfile } = await supabase
    .from('profiles')
    .select('id, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  // Fetch orders related to this user
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      client:users!client_id (full_name),
      creator:profiles!creator_id (users!inner(full_name))
    `)
    .or(`client_id.eq.${user.id},creator_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const validOrders = orders || []

  // Creator statistics
  const activeOrders = validOrders.filter(o => o.creator_id === user.id && (o.status === 'paid' || o.status === 'escrow')).length
  const pendingEscrow = validOrders.filter(o => o.status === 'escrow' && o.creator_id === user.id).reduce((sum, o) => sum + o.amount, 0)
  const totalEarnings = validOrders.filter(o => o.status === 'released' && o.creator_id === user.id).reduce((sum, o) => sum + o.amount, 0)

  // Client statistics
  const activePurchases = validOrders.filter(o => o.client_id === user.id && (o.status === 'paid' || o.status === 'escrow')).length
  const totalSpent = validOrders.filter(o => o.client_id === user.id && (o.status === 'released' || o.status === 'escrow')).reduce((sum, o) => sum + o.amount, 0)

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400">{userData?.full_name || 'Creator'}</span>
          </h1>
          <p className="text-slate-400 text-lg">Here's what's happening with your projects today.</p>
        </div>
        {!creatorProfile && (
          <Link href="/dashboard/profile">
            <Button variant="gradient" className="shadow-lg shadow-rose-500/20 px-8 py-6 rounded-2xl font-bold">
              Set up Creator Profile
            </Button>
          </Link>
        )}
      </header>

      <Tabs defaultValue={userData?.role === 'creator' ? 'creator' : 'client'} className="w-full">
        <TabsList className="bg-slate-900/50 border border-white/10 p-1 rounded-full mb-8">
          <TabsTrigger value="creator" className="rounded-full px-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">As Creator</TabsTrigger>
          <TabsTrigger value="client" className="rounded-full px-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">As Client</TabsTrigger>
        </TabsList>

        <TabsContent value="creator" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Active Commissions</h3>
                <p className="text-4xl font-bold text-white">{activeOrders}</p>
              </CardContent>
            </Card>

            <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-rose-500/30 transition-all duration-500">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Pending Escrow</h3>
                <p className="text-4xl font-bold text-white">Rp {pendingEscrow.toLocaleString('id-ID')}</p>
              </CardContent>
            </Card>

            <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Total Earnings</h3>
                <p className="text-4xl font-bold text-white">Rp {totalEarnings.toLocaleString('id-ID')}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="client" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Active Purchases</h3>
                <p className="text-4xl font-bold text-white">{activePurchases}</p>
              </CardContent>
            </Card>

            <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-1">Total Spent</h3>
                <p className="text-4xl font-bold text-white">Rp {totalSpent.toLocaleString('id-ID')}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Card className="glass border-white/5 bg-slate-900/40 backdrop-blur-xl rounded-3xl overflow-hidden mt-8">
        <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
          <CardTitle className="text-xl font-bold text-white">Recent Activity</CardTitle>
          <CardDescription>Track your commission requests and escrow updates here.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {validOrders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6 border border-white/5">
                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
                No recent activity. Start exploring or complete your profile to get discovered by potential buyers!
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/explore">
                  <Button variant="secondary" className="px-8 h-12 rounded-xl">
                    Explore Marketplace
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {validOrders.slice(0, 5).map(order => {
                const isClient = order.client_id === user.id
                const otherPartyName = isClient ? order.creator?.users?.full_name : order.client?.full_name
                const badgeColor = order.status === 'escrow' ? 'bg-amber-500/20 text-amber-400' :
                                   order.status === 'released' ? 'bg-emerald-500/20 text-emerald-400' :
                                   order.status === 'pending' ? 'bg-slate-500/20 text-slate-400' :
                                   'bg-indigo-500/20 text-indigo-400'
                                   
                return (
                  <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-800/30 rounded-2xl border border-white/5">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-white font-semibold">Commission {isClient ? 'with' : 'for'} {otherPartyName}</p>
                      <p className="text-sm text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-lg font-bold text-rose-400">Rp {order.amount.toLocaleString('id-ID')}</span>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
