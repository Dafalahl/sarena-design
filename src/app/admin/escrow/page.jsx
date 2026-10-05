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
      <div className="flex items-center justify-center py-24 text-black select-none">
        <div className="text-center p-8 bg-white border-[3px] border-black rounded-none shadow-brutalist max-w-sm">
          <h1 className="text-2xl font-black uppercase text-accent-orange mb-3">Access Denied</h1>
          <p className="text-xs font-semibold text-slate-600">You must be an administrator to view this page.</p>
        </div>
      </div>
    )
  }

  // Fetch all workspaces in escrow status
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      client:users!client_id (full_name, email),
      creator:users!creator_id (full_name, email)
    `)
    .eq('status', 'escrow')
    .order('updated_at', { ascending: false })

  const escrowWorkspaces = workspaces || []

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16 text-black select-none">
      <div className="space-y-6">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1.5 shadow-brutalist-sm">
            CONTROL CENTER
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-1">Escrow Management</h1>
          <p className="text-slate-600 text-xs font-semibold">Validate completed work and release funds to designers.</p>
        </div>

        <Card className="bg-white border-[3px] border-black rounded-none overflow-hidden shadow-brutalist">
          <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50">
            <CardTitle className="font-black uppercase text-black text-base">Pending Workspace Releases</CardTitle>
            <CardDescription className="text-slate-600 text-xs font-semibold">Funds are currently held securely by Sarena via Pakasir.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {escrowWorkspaces.length === 0 ? (
               <div className="text-center py-16 text-slate-500 font-mono font-bold uppercase text-xs">
                 No active workspaces currently held in escrow.
               </div>
            ) : (
               <table className="w-full text-left border-collapse bg-white">
                 <thead>
                   <tr className="bg-black text-white text-[10px] font-bold font-mono uppercase tracking-widest border-b-2 border-black">
                     <th className="px-6 py-3.5 border-r border-black/20">Workspace ID</th>
                     <th className="px-6 py-3.5 border-r border-black/20">Client</th>
                     <th className="px-6 py-3.5 border-r border-black/20">Designer</th>
                     <th className="px-6 py-3.5 border-r border-black/20">Amount</th>
                     <th className="px-6 py-3.5 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y border-black">
                   {escrowWorkspaces.map((workspace) => (
                     <tr key={workspace.id} className="border-b-2 border-black hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-mono text-[10px] text-accent-purple font-bold border-r border-black/10 select-all">{workspace.id.slice(0, 18)}...</td>
                       <td className="px-6 py-4 border-r border-black/10">
                         <p className="text-black font-black uppercase text-xs leading-none">{workspace.client?.full_name}</p>
                         <p className="text-[9px] font-mono text-slate-500 font-bold lowercase mt-1">{workspace.client?.email}</p>
                       </td>
                       <td className="px-6 py-4 border-r border-black/10">
                         <p className="text-black font-black uppercase text-xs leading-none">{workspace.creator?.full_name}</p>
                         <p className="text-[9px] font-mono text-slate-500 font-bold lowercase mt-1">{workspace.creator?.email}</p>
                       </td>
                       <td className="px-6 py-4 border-r border-black/10 font-mono font-bold text-xs">
                         <span className="bg-accent-lime border border-black px-2 py-0.5 shadow-brutalist-sm">
                           Rp {workspace.amount.toLocaleString('id-ID')}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <form action={`/api/admin/release`} method="POST">
                           <input type="hidden" name="workspaceId" value={workspace.id} />
                           <Button type="submit" variant="destructive" size="sm">
                             Release Funds
                           </Button>
                         </form>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
