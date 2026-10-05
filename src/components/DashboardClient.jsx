'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Clock, ArrowUpRight, ShieldCheck, Briefcase, Wallet } from 'lucide-react'
import ReloadButton from '@/components/ReloadButton'
import { supabase } from '@/lib/supabase'

export default function DashboardClient({ user, userData, initialWorkspaces }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          client:users!client_id (full_name),
          creator:users!creator_id (full_name)
        `)
        .or(`client_id.eq.${user.id},creator_id.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching workspaces on client:', error)
        return
      }
      setWorkspaces(data || [])
    } catch (err) {
      console.error('Failed to fetch workspaces:', err)
    }
  }

  useEffect(() => {
    let active = true

    // Subscribe to realtime updates on workspaces table (scoped to user)
    const channel = supabase
      .channel(`dashboard-workspaces-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces'
        },
        (payload) => {
          console.log('Realtime workspace change event received:', payload)
          if (active) {
            fetchWorkspaces()
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime workspaces subscription status for ${user.id}:`, status)
      })

    // Poll fallback (every 5 seconds) to guarantee updates if realtime fails or is blocked by local auth bypass
    const pollInterval = setInterval(() => {
      if (active) {
        fetchWorkspaces()
      }
    }, 5000)

    return () => {
      active = false
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [user.id])

  // Dynamic role-aware statistics
  const isCreator = userData?.role === 'creator' || userData?.role === 'designer'

  const escrowAmount = workspaces
    .filter(w => (isCreator ? w.creator_id === user.id : w.client_id === user.id) && w.status === 'escrow')
    .reduce((sum, w) => sum + (w.amount || 0), 0)

  const activeCount = workspaces
    .filter(w => (isCreator ? w.creator_id === user.id : w.client_id === user.id) && w.status === 'escrow')
    .length

  const pendingCount = workspaces
    .filter(w => (isCreator ? w.creator_id === user.id : w.client_id === user.id) && w.status === 'pending')
    .length

  const settledAmount = workspaces
    .filter(w => (isCreator ? w.creator_id === user.id : w.client_id === user.id) && w.status === 'released')
    .reduce((sum, w) => sum + (w.amount || 0), 0)

  return (
    <div className="space-y-6 md:space-y-8 text-black">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            COLLECTIVE WORKSPACE
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
            Dashboard
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">Rencanakan, prioritaskan, dan pantau seluruh transaksi kolaborasi Anda dengan mudah.</p>
        </div>
      </header>

      {/* Role-Aware 4-Card Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Dana di Escrow */}
        <Link href="/workspace" className="block group">
          <div className="bg-black text-white p-5 md:p-6 rounded-none flex flex-col justify-between min-h-[10rem] border-2 border-black relative overflow-hidden shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-slate-300 uppercase tracking-widest">
                Dana di Escrow
              </span>
              <div className="w-8 h-8 rounded-none bg-zinc-800 flex items-center justify-center text-white border border-zinc-700 group-hover:bg-accent-lime group-hover:text-black transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold font-mono tracking-tight">Rp {escrowAmount.toLocaleString('id-ID')}</p>
              <span className="text-[9px] font-bold font-mono text-accent-lime border border-accent-lime px-2 py-0.5 mt-2.5 inline-block uppercase tracking-wider shadow-brutalist-sm bg-black">
                {isCreator ? 'Aman di Rekber' : 'Terproteksi Aman'}
              </span>
            </div>
          </div>
        </Link>

        {/* Card 2: Workspace Aktif */}
        <Link href="/workspace" className="block group">
          <div className="bg-accent-purple text-white border-2 border-black p-5 md:p-6 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-slate-200 uppercase tracking-widest">
                {isCreator ? 'Pesanan Aktif' : 'Proyek Berjalan'}
              </span>
              <div className="w-8 h-8 rounded-none bg-white text-black border-2 border-black flex items-center justify-center group-hover:bg-accent-lime transition-colors shadow-brutalist-sm">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black font-mono leading-none">{activeCount}</p>
              <span className="text-[9px] font-bold font-mono text-black border-2 border-black bg-white px-2.5 py-0.5 mt-2.5 inline-block uppercase tracking-wider shadow-brutalist-sm">
                {isCreator ? 'Dalam Garapan' : 'Dalam Pengerjaan'}
              </span>
            </div>
          </div>
        </Link>

        {/* Card 3: Menunggu Konfirmasi */}
        <Link href="/workspace" className="block group">
          <div className="bg-accent-lime text-black border-2 border-black p-5 md:p-6 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-black uppercase tracking-widest">
                Menunggu Konfirmasi
              </span>
              <div className="w-8 h-8 rounded-none bg-white text-black border-2 border-black flex items-center justify-center group-hover:bg-accent-purple group-hover:text-white transition-colors shadow-brutalist-sm">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black font-mono leading-none">{pendingCount}</p>
              <span className="text-[9px] font-bold font-mono text-black border-2 border-black bg-white px-2.5 py-0.5 mt-2.5 inline-block uppercase tracking-wider shadow-brutalist-sm">
                Perlu Tindakan
              </span>
            </div>
          </div>
        </Link>

        {/* Card 4: Transaksi Selesai */}
        <Link href="/transactions" className="block group">
          <div className="bg-accent-yellow text-black border-2 border-black p-5 md:p-6 rounded-none flex flex-col justify-between min-h-[10rem] shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-black uppercase tracking-widest">
                {isCreator ? 'Total Pendapatan' : 'Pengeluaran Selesai'}
              </span>
              <div className="w-8 h-8 rounded-none bg-white text-black border-2 border-black flex items-center justify-center group-hover:bg-accent-lime transition-colors shadow-brutalist-sm">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold font-mono tracking-tight leading-tight">Rp {settledAmount.toLocaleString('id-ID')}</p>
              <span className="text-[9px] font-bold font-mono text-black uppercase mt-2.5 border border-black bg-white px-2 py-0.5 inline-block shadow-brutalist-sm">
                {isCreator ? 'Dana Berhasil Cair' : 'Transaksi Sukses'}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Full Width Workspaces Section */}
      <div className="w-full">
        <Card className="bg-white border-2 border-black rounded-none overflow-hidden shadow-brutalist">
          <CardHeader className="p-5 md:p-6 border-b-2 border-black bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="font-black text-black uppercase text-base sm:text-lg">My Workspaces</CardTitle>
              <CardDescription className="text-slate-600 text-xs font-semibold mt-0.5">Pantau seluruh workspace aktif, revisi berkala, dan aksi transaksi aman Anda.</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/workspace">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider bg-white text-black hover:bg-slate-100 cursor-pointer"
                >
                  Semua Workspace
                </Button>
              </Link>
              <Link href="/workspace/new">
                <Button
                  size="sm"
                  className="h-9 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider bg-accent-lime text-black hover:bg-emerald-400 cursor-pointer"
                >
                  + Buat Workspace
                </Button>
              </Link>
              <ReloadButton onClick={fetchWorkspaces} />
            </div>
          </CardHeader>

          <CardContent className="p-5 md:p-6 bg-white">
            {workspaces.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-5">
                <div className="w-16 h-16 border-2 border-black bg-slate-50 flex items-center justify-center mx-auto shadow-brutalist-sm">
                  <Clock className="w-7 h-7 text-black animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-black text-sm font-black uppercase tracking-wide">
                    Belum Ada Workspace Aktif
                  </p>
                  <p className="text-slate-600 text-xs font-medium max-w-sm mx-auto">
                    Mulai jelajahi portofolio kreator di direktori atau buat workspace baru untuk memulai kolaborasi.
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
                {workspaces.map(ws => {
                  const isClient = ws.client_id === user.id
                  const otherPartyName = isClient 
                    ? (ws.creator?.full_name || 'Seeking Designer') 
                    : (ws.client?.full_name || 'Seeking Client')
                  const badgeColor = ws.status === 'escrow' ? (ws.handshake ? 'bg-accent-lime text-black border-black shadow-brutalist-sm' : 'bg-accent-yellow text-black border-black shadow-brutalist-sm') :
                                     ws.status === 'released' ? 'bg-accent-blue text-black border-black shadow-brutalist-sm' :
                                     ws.status === 'refunded' ? 'bg-rose-100 text-rose-800 border-black shadow-brutalist-sm' :
                                     ws.status === 'pending' ? (!ws.handshake ? 'bg-accent-yellow text-black border-black shadow-brutalist-sm' : 'bg-accent-blue text-black border-black shadow-brutalist-sm') :
                                     'bg-[#FAF9F6] text-black border-black shadow-brutalist-sm'
                                     
                  return (
                    <Link href={`/workspace/${ws.id}`} key={ws.id} className="block group">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-none border-2 border-black hover:bg-slate-50 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist-sm active:translate-x-0 active:translate-y-0 transition-all cursor-pointer shadow-none gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-black font-black uppercase text-sm truncate group-hover:text-accent-purple transition-colors">
                            {ws.title || `Workspace ${isClient ? 'bersama' : 'untuk'} ${otherPartyName}`}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider" suppressHydrationWarning>
                            Pihak Terkait: <span className="text-black font-black">{otherPartyName}</span> | Dibuat: {new Date(ws.created_at).toLocaleDateString()} | Revisi: {ws.revisions_used}/{ws.revisions}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          <span className="text-xs font-black bg-[#FAF9F6] border-2 border-black px-3 py-1 shadow-brutalist-xs">
                            Rp {ws.amount.toLocaleString('id-ID')}
                          </span>
                          <span className={`px-3 py-1 border-2 text-[9px] font-bold uppercase tracking-widest ${badgeColor}`}>
                            {ws.status === 'escrow' ? (ws.handshake ? 'Workspace Aktif (Escrow)' : 'Menunggu Konfirmasi') : ws.status === 'pending' ? (!ws.handshake ? 'Menunggu Persetujuan Desainer' : 'Menunggu Pembayaran Escrow') : ws.status === 'released' ? 'Selesai' : ws.status === 'refunded' ? 'Ditolak / Dibatalkan' : ws.status}
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
    </div>
  )
}
