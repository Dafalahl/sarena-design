import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Briefcase, ArrowUpRight, Clock, CheckCircle2, AlertOctagon, TrendingUp } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import ReloadButton from '@/components/ReloadButton'

export default async function WorkspaceListPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user data from the core users table
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, username')
    .eq('id', user.id)
    .single()

  if (userData && !userData.username) {
    redirect('/account')
  }

  // Fetch workspaces related to this user
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      client:users!client_id (full_name),
      creator:users!creator_id (full_name)
    `)
    .or(`client_id.eq.${user.id},creator_id.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const validWorkspaces = workspaces || []

  // Calculate stats
  const pendingCount = validWorkspaces.filter(w => w.status === 'pending').length
  const activeCount = validWorkspaces.filter(w => w.status === 'escrow').length
  const completedCount = validWorkspaces.filter(w => w.status === 'released').length

  return (
    <div className="space-y-6 md:space-y-8 text-black">
      {/* Header Bar */}
      <header className="pb-6 border-b-2 border-black">
        <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
          WORKSPACE MANAGEMENT
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
          Workspaces
        </h1>
        <p className="text-slate-600 text-xs font-semibold mt-1">Kelola seluruh kolaborasi aktif, revisi berkala, dan aksi transaksi aman Anda.</p>
      </header>

      {/* Main Workspace Table List */}
      <Card className="bg-white border-2 border-black rounded-none overflow-hidden shadow-brutalist">
        <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="font-black text-black uppercase text-base sm:text-lg">Daftar Workspace</CardTitle>
              {/* Compact Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-accent-lime text-black shadow-brutalist-xs">
                  {activeCount} Aktif
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-accent-yellow text-black shadow-brutalist-xs">
                  {pendingCount} Menunggu
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-white text-slate-700 shadow-brutalist-xs">
                  {completedCount} Selesai
                </span>
              </div>
            </div>
            <CardDescription className="text-slate-600 text-xs font-semibold mt-1">
              Seluruh ruang kerja kolaborasi Anda baik sebagai klien maupun kreator.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/workspace/new">
              <Button
                size="sm"
                className="h-9 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider bg-accent-lime text-black hover:bg-emerald-400 cursor-pointer"
              >
                + Buat Workspace
              </Button>
            </Link>
            <ReloadButton />
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-6 bg-white">
          {validWorkspaces.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-5">
              <div className="w-16 h-16 border-2 border-black bg-slate-50 flex items-center justify-center mx-auto shadow-brutalist-sm">
                <Clock className="w-7 h-7 text-black animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-black text-sm font-black uppercase tracking-wide">
                  Belum Ada Workspace
                </p>
                <p className="text-slate-600 text-xs font-medium max-w-sm mx-auto">
                  Belum ada workspace yang dibuat. Mulai cari desainer di direktori atau buat workspace baru untuk memulai kolaborasi.
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <Link href="/explore">
                  <Button variant="default" className="text-xs uppercase font-mono font-bold h-10 px-6">
                    Cari Desainer
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {validWorkspaces.map(ws => {
                const isClient = ws.client_id === user.id
                const otherPartyName = isClient 
                  ? (ws.creator?.full_name || 'Seeking Creator') 
                  : (ws.client?.full_name || 'Seeking Client')
                
                const hasNegoTag = ws.title && ws.title.startsWith('[NEGO]');
                const cleanTitle = hasNegoTag ? ws.title.replace('[NEGO]', '').trim() : ws.title;

                let badgeColor = 'bg-white text-slate-500 border-dashed border-black shadow-none'
                let statusLabel = ws.status

                if (ws.status === 'escrow') {
                  badgeColor = ws.handshake 
                    ? 'bg-accent-lime text-black border-black shadow-brutalist-sm' 
                    : 'bg-accent-yellow text-black border-black shadow-brutalist-sm'
                  statusLabel = ws.handshake ? 'Workspace Aktif (Escrow)' : 'Menunggu Konfirmasi'
                } else if (ws.status === 'released') {
                  badgeColor = 'bg-accent-blue text-black border-black shadow-brutalist-sm'
                  statusLabel = 'Selesai'
                } else if (ws.status === 'refunded') {
                  badgeColor = 'bg-accent-orange text-black border-black shadow-brutalist-sm'
                  statusLabel = 'Dibatalkan'
                } else if (ws.status === 'pending') {
                  if (!ws.handshake) {
                    badgeColor = 'bg-accent-yellow text-black border-black shadow-brutalist-sm'
                    statusLabel = 'Menunggu Persetujuan Desainer'
                  } else {
                    badgeColor = 'bg-accent-blue text-black border-black shadow-brutalist-sm'
                    statusLabel = 'Menunggu Pembayaran Escrow'
                  }
                }

                return (
                  <Link href={`/workspace/${ws.id}`} key={ws.id} className="block group">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-none border-2 border-black hover:bg-slate-50 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist-sm active:translate-x-0 active:translate-y-0 transition-all cursor-pointer shadow-none gap-4">
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2">
                          <p className="text-black font-black uppercase text-xs sm:text-sm truncate group-hover:text-accent-purple transition-colors">
                            {cleanTitle || `Workspace bersama ${otherPartyName}`}
                          </p>
                          {hasNegoTag && (
                            <span className="bg-accent-orange text-black font-mono font-black text-[8px] px-1.5 py-0.5 border border-black shadow-brutalist-sm leading-none uppercase tracking-wider">
                              Nego
                            </span>
                          )}
                          <span className="text-[9px] font-black font-mono border border-black px-1.5 py-0.5 leading-none uppercase bg-slate-50">
                            {isClient ? 'Client' : 'Creator'}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider" suppressHydrationWarning>
                          Pihak Terkait: <span className="text-black font-black">{otherPartyName}</span> | Dibuat: {new Date(ws.created_at).toLocaleDateString()} | Revisi: {ws.revisions_used}/{ws.revisions}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-xs font-black bg-[#FAF9F6] border-2 border-black px-3 py-1 shadow-brutalist-xs">
                          Rp {ws.amount.toLocaleString('id-ID')}
                        </span>
                        <span className={`px-3 py-1 border-2 text-[9px] font-bold uppercase tracking-widest ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
