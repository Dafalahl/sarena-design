import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/Button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {userProfile?.full_name || 'Creator'}</h1>
          <p className="text-slate-400">Here's what's happening with your projects today.</p>
        </div>
        {!userProfile?.is_creator_setup && (
          <Link href="/dashboard/profile-setup">
            <Button variant="primary">Set up Creator Profile</Button>
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl border-l-4 border-indigo-500">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Active Orders</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="glass p-6 rounded-2xl border-l-4 border-rose-500">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Pending Escrow</h3>
          <p className="text-3xl font-bold text-white">Rp 0</p>
        </div>
        <div className="glass p-6 rounded-2xl border-l-4 border-emerald-500">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Total Earnings</h3>
          <p className="text-3xl font-bold text-white">Rp 0</p>
        </div>
      </div>

      <div className="glass p-8 rounded-2xl mt-8">
        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="text-center py-12 text-slate-400">
          <p>No recent activity. Start exploring or complete your profile to get discovered!</p>
          <div className="mt-6">
            <Link href="/explore">
              <Button variant="secondary">Explore Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
