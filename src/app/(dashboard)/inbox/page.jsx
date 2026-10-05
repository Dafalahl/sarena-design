'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Mail, CheckCircle2, XCircle, MessageCircle, Send,
  ArrowRight, Briefcase, ChevronLeft, Search
} from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import Link from 'next/link'

// ─── Tab: Workspace Invitations ───────────────────────────────────────────────
function InvitationsTab({ currentUser, userData }) {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [systemMessage, setSystemMessage] = useState(null)

  const loadInvitations = useCallback(async () => {
    if (!currentUser) return
    try {
      const { data } = await supabase
        .from('workspaces')
        .select(`
          *,
          client:users!client_id (id, full_name, email, avatar_url, username),
          creator:users!creator_id (id, full_name, email, avatar_url, username)
        `)
        .eq('status', 'pending')
        .or(`client_id.eq.${currentUser.id},creator_id.eq.${currentUser.id}`)
        .neq('created_by', currentUser.id)

      setInvitations(
        (data || []).filter(ws => ws.client_id !== null && ws.creator_id !== null)
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => { loadInvitations() }, [loadInvitations])

  const handleAccept = async (ws) => {
    setActionLoading(true)
    setSystemMessage(null)
    try {
      const isClient = ws.client_id === currentUser.id
      if (isClient) {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: ws.id })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.checkout_url) window.location.href = data.checkout_url
      } else {
        const res = await fetch('/api/workspace/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: ws.id })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setSystemMessage(data.message || 'Tawaran berhasil diterima! Notifikasi telah dikirim ke klien.')
        loadInvitations()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('inbox-updated'))
        }
      }
    } catch (err) {
      setSystemMessage(`Error: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async (wsId) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan / menolak tawaran proyek ini? Workspace tidak akan dibuat dan notifikasi pembatalan akan dikirimkan ke Inbox pihak lain.')) return
    setActionLoading(true)
    setSystemMessage(null)
    // Optimistic removal from UI
    setInvitations(prev => prev.filter(ws => ws.id !== wsId))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inbox-updated'))
    }
    try {
      const res = await fetch('/api/workspace/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSystemMessage(data.message || 'Undangan berhasil ditolak.')
      loadInvitations()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('inbox-updated'))
      }
    } catch (err) {
      setSystemMessage(`Error: ${err.message}`)
      loadInvitations()
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="py-20 text-center font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
      Memuat undangan...
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header count */}
      <div className="flex items-center gap-2 pb-3 border-b-2 border-black">
        <span className="text-xs font-black uppercase tracking-wide">Undangan Kolaborasi</span>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-black bg-accent-lime text-black shadow-brutalist-xs">
          {invitations.length} Total
        </span>
      </div>

      {systemMessage && (
        <div className="border-2 border-black bg-accent-lime p-3 text-xs font-bold uppercase tracking-wide font-mono shadow-brutalist-sm">
          {systemMessage}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="border-2 border-black bg-white py-16 px-4 text-center shadow-brutalist rounded-none space-y-5">
          <div className="w-16 h-16 border-2 border-black bg-slate-50 flex items-center justify-center mx-auto shadow-brutalist-sm">
            <Mail className="w-7 h-7 text-black animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-black text-sm font-black uppercase tracking-wide">Belum Ada Undangan</p>
            <p className="text-slate-600 text-xs font-medium max-w-sm mx-auto">
              Undangan kolaborasi workspace yang dikirimkan oleh klien atau desainer lain akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((ws) => {
            const initiator = ws.created_by === ws.client_id ? ws.client : ws.creator
            const inviteeRole = ws.client_id === currentUser.id ? 'Client' : 'Designer'
            const isClient = ws.client_id === currentUser.id
            const isDesigner = ws.creator_id === currentUser.id
            const isAcceptedByDesigner = ws.handshake === true

            return (
              <Card key={ws.id} className="bg-white border-2 border-black rounded-none shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000000] transition-all">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={initiator?.avatar_url}
                        name={initiator?.full_name}
                        email={initiator?.email}
                        className="w-8 h-8 rounded-none border border-black"
                      />
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">
                          {initiator?.full_name || 'Anonymous User'}
                        </p>
                        <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                          Mengundang Anda sebagai {inviteeRole === 'Client' ? 'Klien' : 'Desainer'}
                        </p>
                      </div>
                    </div>
                    {ws.title && (
                      <div className="text-xs font-black uppercase tracking-wide bg-accent-purple text-white border-2 border-black px-3 py-1 shadow-brutalist-xs inline-block">
                        Proyek: {ws.title}
                      </div>
                    )}
                    <div className="bg-[#FAF9F6] border border-black p-3 font-mono text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {ws.brief || 'Tidak ada rincian brief tambahan.'}
                    </div>
                    <div className="flex flex-wrap gap-2.5 items-center">
                      <Badge variant="outline" className="font-mono text-[9px] bg-slate-50 border-black">
                        Anggaran: Rp {ws.amount.toLocaleString('id-ID')}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[9px] bg-slate-50 border-black">
                        Revisi: {ws.revisions} siklus
                      </Badge>
                      {isAcceptedByDesigner ? (
                        <Badge className="font-mono text-[9px] bg-accent-lime text-black border-black">
                          ✅ Sudah Diterima Desainer · Menunggu Pembayaran Escrow
                        </Badge>
                      ) : (
                        <Badge className="font-mono text-[9px] bg-accent-yellow text-black border-black">
                          ⏳ Menunggu Persetujuan Desainer
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-3 shrink-0">
                    {isDesigner && isAcceptedByDesigner ? (
                      /* Designer already accepted: show link to workspace, plus option to decline before payment */
                      <div className="flex flex-col gap-2 w-full md:w-36">
                        <Link href={`/workspace/${ws.id}`}>
                          <Button
                            className="w-full h-10 text-[10px] uppercase font-black bg-black text-white border-2 border-black rounded-none shadow-brutalist-xs hover:bg-slate-800"
                          >
                            Buka Workspace
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleDecline(ws.id)}
                          disabled={actionLoading}
                          variant="destructive"
                          className="w-full h-8 text-[9px] uppercase font-black border-2 border-black rounded-none shadow-brutalist-xs"
                        >
                          ❌ Tolak
                        </Button>
                      </div>
                    ) : isClient && isAcceptedByDesigner ? (
                      /* Client needs to pay escrow or can cancel */
                      <div className="flex flex-col gap-2 w-full md:w-36">
                        <Button
                          onClick={() => handleAccept(ws)}
                          disabled={actionLoading}
                          className="w-full h-10 text-[10px] uppercase font-black bg-black text-white border-2 border-black rounded-none shadow-brutalist-xs hover:bg-slate-800"
                        >
                          {actionLoading ? 'Memproses...' : '💳 Bayar Escrow'}
                        </Button>
                        <Button
                          onClick={() => handleDecline(ws.id)}
                          disabled={actionLoading}
                          variant="destructive"
                          className="w-full h-8 text-[9px] uppercase font-black border-2 border-black rounded-none shadow-brutalist-xs"
                        >
                          ❌ Batalkan
                        </Button>
                      </div>
                    ) : (
                      /* Designer has not accepted yet */
                      <>
                        <Button
                          onClick={() => handleAccept(ws)}
                          disabled={actionLoading}
                          className="flex-1 md:w-36 h-10 text-[10px] uppercase font-black bg-accent-lime text-black border-2 border-black rounded-none shadow-brutalist-xs hover:bg-emerald-400"
                        >
                          {actionLoading ? 'Memproses...' : isClient ? 'Bayar & Mulai' : '✅ Terima Undangan'}
                        </Button>
                        <Button
                          onClick={() => handleDecline(ws.id)}
                          disabled={actionLoading}
                          variant="destructive"
                          className="flex-1 md:w-36 h-10 text-[10px] uppercase font-black border-2 border-black rounded-none shadow-brutalist-xs"
                        >
                          {isClient ? '❌ Batalkan' : '❌ Tolak'}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Direct Messages / Inquiry Chat ──────────────────────────────────────
function DirectMessagesTab({ currentUser, initialDmUsername }) {
  const [threads, setThreads] = useState([])         // list of DM conversations
  const [activeThread, setActiveThread] = useState(null)  // { user: {...}, messages: [] }
  const activeThreadRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [usersList, setUsersList] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  // Keep activeThreadRef in sync
  useEffect(() => {
    activeThreadRef.current = activeThread
  }, [activeThread])

  // ── Build thread list from workspace_chats where workspace_id IS NULL ──
  const loadThreads = useCallback(async (isInitial = false) => {
    if (!currentUser?.id) return
    if (isInitial) setLoadingThreads(true)
    try {
      // Fetch all inquiry messages involving current user
      const { data, error } = await supabase
        .from('workspace_chats')
        .select(`
          *,
          sender:users!sender_id(id, full_name, username, avatar_url, email, role, price_base)
        `)
        .is('workspace_id', null)
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group by the other party's user id
      const threadMap = {}
      for (const msg of (data || [])) {
        const otherId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id
        if (!otherId) continue
        if (!threadMap[otherId]) {
          const otherUser = msg.sender_id !== currentUser.id ? msg.sender : null
          threadMap[otherId] = { otherId, lastMsg: msg, otherUser, unread: 0 }
        }
        // Count unread - NEVER count unread if otherId is currently open
        if (msg.recipient_id === currentUser.id && !msg.is_read) {
          if (activeThreadRef.current?.id !== otherId) {
            threadMap[otherId].unread++
          }
        }
      }

      // Fetch user info for threads where we sent the message (other user is recipient)
      const otherIds = Object.keys(threadMap).filter(id => !threadMap[id].otherUser)
      if (otherIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url, email, role, price_base')
          .in('id', otherIds)
        for (const u of (usersData || [])) {
          if (threadMap[u.id]) threadMap[u.id].otherUser = u
        }
      }

      setThreads(Object.values(threadMap).sort((a, b) =>
        new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at)
      ))
    } catch (err) {
      console.error('Load threads error:', err)
    } finally {
      setLoadingThreads(false)
    }
  }, [currentUser?.id])

  useEffect(() => { loadThreads(true) }, [loadThreads])

  // ── Auto-open DM if ?dm=username is set ────────────────────────────────────
  useEffect(() => {
    if (!initialDmUsername || !currentUser) return
    async function openDmByUsername() {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, email, role, price_base')
        .eq('username', initialDmUsername)
        .single()
      if (data) openThread(data)
    }
    openDmByUsername()
  }, [initialDmUsername, currentUser])

  // ── Open a thread & load messages ──────────────────────────────────────────
  const openThread = async (otherUser) => {
    setActiveThread(otherUser)
    activeThreadRef.current = otherUser
    setLoadingChat(true)
    setMessages([])

    // Update unread count immediately in local thread state
    setThreads(prev => prev.map(t => {
      if (t.otherId === otherUser.id) {
        return { ...t, unread: 0 }
      }
      return t
    }))

    // Notify sidebar & tabs immediately so badge clears without lag
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inbox-updated'))
    }

    // Mark existing incoming messages as read in database via service API
    if (currentUser?.id && otherUser?.id) {
      try {
        await fetch('/api/inbox/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: otherUser.id, userId: currentUser.id })
        })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('inbox-updated'))
        }
      } catch (markErr) {
        console.warn('Failed to mark messages as read:', markErr)
      }
    }

    // Load messages
    const { data } = await supabase
      .from('workspace_chats')
      .select(`*, sender:users!sender_id(id, full_name, username, avatar_url)`)
      .is('workspace_id', null)
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUser.id}),` +
        `and(sender_id.eq.${otherUser.id},recipient_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true })

    setMessages(data || [])
    setLoadingChat(false)

    // Subscribe to realtime for this conversation
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase
      .channel(`inquiry-dm-${[currentUser.id, otherUser.id].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workspace_chats'
      }, async (payload) => {
        const msg = payload.new
        const isThisConvo =
          (msg.sender_id === currentUser.id && msg.recipient_id === otherUser.id) ||
          (msg.sender_id === otherUser.id && msg.recipient_id === currentUser.id)
        if (isThisConvo) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            // Replace matching optimistic message if this was sent by me
            if (msg.sender_id === currentUser.id) {
              const optIndex = prev.findIndex(m => String(m.id).startsWith('opt-') && m.message === msg.message)
              if (optIndex !== -1) {
                const updated = [...prev]
                updated[optIndex] = msg
                return updated
              }
            }
            return [...prev, msg]
          })
          // Auto-mark read if it's incoming
          if (msg.sender_id === otherUser.id) {
            try {
              await fetch('/api/inbox/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: otherUser.id, userId: currentUser.id })
              })
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('inbox-updated'))
              }
            } catch (e) {
              console.warn(e)
            }
          }
          loadThreads()
        }
      })
      .subscribe()
    channelRef.current = ch
  }

  // ── Cleanup realtime on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  // ── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim() || !activeThread || sending) return
    setSending(true)
    setSendError(null)
    const text = inputText.trim()
    setInputText('')

    // Optimistic UI: show message instantly
    const optimisticId = `opt-${Date.now()}`
    const optimisticMsg = {
      id: optimisticId,
      sender_id: currentUser.id,
      recipient_id: activeThread.id,
      message: text,
      channel_type: 'inquiry',
      workspace_id: null,
      created_at: new Date().toISOString(),
      sender: null
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const { data: insertedData, error } = await supabase
        .from('workspace_chats')
        .insert({
          workspace_id: null,
          channel_type: 'inquiry',
          sender_id: currentUser.id,
          recipient_id: activeThread.id,
          message: text
        })
        .select()
        .single()

      if (error) {
        // Rollback optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        setInputText(text)
        setSendError(`Gagal kirim: ${error.message}`)
        console.error('Supabase insert error:', error)
      } else {
        if (insertedData) {
          setMessages(prev => {
            // If realtime already replaced it
            if (prev.some(m => m.id === insertedData.id)) {
              return prev.filter(m => m.id !== optimisticId)
            }
            return prev.map(m => m.id === optimisticId ? insertedData : m)
          })
        }
        loadThreads()
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInputText(text)
      setSendError(`Gagal kirim: ${err.message}`)
      console.error('Send error:', err)
    } finally {
      setSending(false)
    }
  }

  // ── User search for new DM ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setUsersList([]); return }
    const timer = setTimeout(async () => {
      const q = searchQuery.trim().replace(/^@/, '').toLowerCase()
      const { data } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, email, role, price_base')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .neq('id', currentUser.id)
        .limit(6)
      setUsersList(data || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, currentUser])

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts) => {
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hari ini'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black shadow-brutalist overflow-hidden" style={{ minHeight: '560px' }}>
      {/* ── Left Panel: Thread List ── */}
      <div className={`md:col-span-1 border-r-2 border-black bg-white flex flex-col ${activeThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Search / New DM Header */}
        <div className="p-3 border-b-2 border-black bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest">Pesan Langsung</span>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="ml-auto text-[9px] font-mono font-bold uppercase border border-black px-2 py-0.5 bg-white hover:bg-accent-lime transition-colors"
            >
              + Mulai Chat
            </button>
          </div>
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari username..."
                className="pl-8 text-xs h-8 font-mono border-black rounded-none"
              />
              {usersList.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-black z-30 shadow-brutalist divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {usersList.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { openThread(u); setShowSearch(false); setSearchQuery(''); setUsersList([]) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent-lime transition-colors text-left"
                    >
                      <UserAvatar src={u.avatar_url} name={u.full_name} email={u.email} className="w-7 h-7 rounded-none border border-black shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black truncate">@{u.username}</p>
                        <p className="text-[9px] text-slate-500 font-mono uppercase">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingThreads ? (
            <div className="py-10 text-center font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse text-slate-400">
              Memuat...
            </div>
          ) : threads.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Belum ada percakapan</p>
              <p className="text-[10px] text-slate-400 font-mono">Klik profil desainer lalu tekan "Tanya Desainer" untuk mulai chat</p>
            </div>
          ) : (
            threads.map(thread => {
              const u = thread.otherUser
              const isActive = activeThread?.id === thread.otherId
              return (
                <button
                  key={thread.otherId}
                  onClick={() => openThread(u ? { ...u, id: thread.otherId } : { id: thread.otherId })}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${isActive ? 'bg-accent-lime/30 border-l-4 border-l-black' : ''}`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar src={u?.avatar_url} name={u?.full_name} email={u?.email} className="w-9 h-9 rounded-none border border-black" />
                    {thread.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border border-black text-white text-[8px] font-black flex items-center justify-center font-mono">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="text-[11px] font-black truncate">@{u?.username || '...'}</p>
                      <span className="text-[8px] font-mono text-slate-400 shrink-0 ml-1">{formatDate(thread.lastMsg.created_at)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{thread.lastMsg.message}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Window ── */}
      <div className={`md:col-span-2 flex flex-col bg-[#FAF9F6] ${activeThread ? 'flex' : 'hidden md:flex'}`}>
        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 border-2 border-black bg-white flex items-center justify-center shadow-brutalist-sm">
              <MessageCircle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-black uppercase tracking-wide text-black">Pilih Percakapan</p>
            <p className="text-xs text-slate-500 font-mono max-w-xs">Pilih kontak dari daftar kiri, atau klik "Tanya Desainer" di halaman profil desainer.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b-2 border-black bg-white flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveThread(null)}
                className="md:hidden p-1.5 border border-black hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <UserAvatar
                src={activeThread.avatar_url}
                name={activeThread.full_name}
                email={activeThread.email}
                className="w-8 h-8 rounded-none border border-black shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase truncate">@{activeThread.username}</p>
                <p className="text-[9px] font-mono text-slate-500 uppercase">{activeThread.role}</p>
              </div>
              {/* CTA: Langsung hire setelah nego */}
              {activeThread.role === 'creator' && (
                <Link href={`/workspace/new/${activeThread.username}`}>
                  <button className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase border-2 border-black bg-accent-lime text-black px-2.5 py-1.5 shadow-brutalist-xs hover:bg-black hover:text-white transition-colors shrink-0">
                    <Briefcase className="w-3 h-3" />
                    Hire Sekarang
                  </button>
                </Link>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingChat ? (
                <div className="py-10 text-center font-mono text-[10px] font-bold uppercase tracking-widest animate-pulse text-slate-400">
                  Memuat pesan...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-xs font-black uppercase text-slate-600">Belum ada pesan</p>
                  <p className="text-[10px] font-mono text-slate-400">Kirim pesan pertama untuk memulai negosiasi</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === currentUser.id
                  const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)
                  return (
                    <div key={msg.id || i}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="text-[9px] font-mono font-bold uppercase text-slate-400 border border-slate-200 px-2 py-0.5 bg-white">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[72%] px-3 py-2 text-xs font-medium leading-relaxed border-2 border-black shadow-brutalist-xs ${
                            isMe
                              ? 'bg-black text-white rounded-none'
                              : 'bg-white text-black rounded-none'
                          }`}
                        >
                          {(() => {
                            const wsMatch = msg.message?.match(/\/workspace\/([a-zA-Z0-9-]+)/)
                            const wsUrl = wsMatch ? wsMatch[0] : null
                            const cleanText = wsUrl ? msg.message.replace(wsUrl, '').trim() : msg.message

                            return (
                              <>
                                <p className="whitespace-pre-wrap break-words">{cleanText}</p>
                                {wsUrl && (
                                  <div className="mt-2.5 pt-2 border-t border-current/20">
                                    <Link href={wsUrl}>
                                      <button
                                        type="button"
                                        className={`w-full py-1.5 px-3 text-[10px] font-mono font-black uppercase tracking-wider border-2 border-black transition-all shadow-brutalist-xs active:translate-x-0 active:translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                                          isMe
                                            ? 'bg-accent-lime text-black hover:bg-emerald-300'
                                            : 'bg-black text-white hover:bg-slate-800'
                                        }`}
                                      >
                                        👉 Buka Workspace &amp; Tinjau / Bayar
                                      </button>
                                    </Link>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          <p className={`text-[9px] font-mono mt-1 text-right ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t-2 border-black bg-white shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ketik pesan atau tawaran harga..."
                  className="flex-1 border-2 border-black px-3 py-2 text-xs font-mono bg-[#FAF9F6] focus:outline-none focus:bg-white placeholder-slate-400 rounded-none h-9"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="w-9 h-9 border-2 border-black bg-black text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-brutalist-xs transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              {sendError && (
                <p className="text-[9px] font-mono font-bold text-rose-600 mt-1.5 border border-rose-400 bg-rose-50 px-2 py-1">
                  ⚠ {sendError}
                </p>
              )}
              <p className="text-[9px] font-mono text-slate-400 mt-1.5">Enter untuk kirim · Semua obrolan bersifat privat &amp; hanya terlihat oleh Anda berdua</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Inbox Page ───────────────────────────────────────────────────────────
export default function InboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dmTarget = searchParams.get('dm')   // e.g. ?dm=kardusdeveloper

  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(dmTarget ? 'dm' : 'invites')
  const [invitesCount, setInvitesCount] = useState(0)
  const [unreadDmsCount, setUnreadDmsCount] = useState(0)

  const fetchTabCounts = useCallback(async () => {
    if (!currentUser?.id) return
    try {
      const { data: invites } = await supabase
        .from('workspaces')
        .select('id, client_id, creator_id, handshake')
        .eq('status', 'pending')
        .eq('handshake', false)
        .neq('created_by', currentUser.id)
        .or(`client_id.eq.${currentUser.id},creator_id.eq.${currentUser.id}`)

      const valid = (invites || []).filter(ws => ws.client_id !== null && ws.creator_id !== null)
      setInvitesCount(valid.length)

      const { count } = await supabase
        .from('workspace_chats')
        .select('*', { count: 'exact', head: true })
        .is('workspace_id', null)
        .eq('recipient_id', currentUser.id)
        .eq('is_read', false)

      setUnreadDmsCount(count || 0)
    } catch (e) {
      console.warn("Failed to fetch tab counts", e)
    }
  }, [currentUser?.id])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)
      const { data: profile } = await supabase
        .from('users').select('*').eq('id', user.id).single()
      setUserData(profile)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    fetchTabCounts()
    const handleUpdate = () => fetchTabCounts()
    window.addEventListener('inbox-updated', handleUpdate)
    window.addEventListener('focus', handleUpdate)
    return () => {
      window.removeEventListener('inbox-updated', handleUpdate)
      window.removeEventListener('focus', handleUpdate)
    }
  }, [fetchTabCounts])

  // If ?dm= param changes, switch to DM tab
  useEffect(() => {
    if (dmTarget) setActiveTab('dm')
  }, [dmTarget])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
        Memuat inbox...
      </div>
    </div>
  )

  const tabs = [
    { key: 'invites', label: 'Undangan Workspace', icon: Mail, count: invitesCount },
    { key: 'dm', label: 'Pesan Langsung', icon: MessageCircle, count: unreadDmsCount },
  ]

  return (
    <div className="space-y-6 md:space-y-8 text-black select-none">
      {/* Page Header */}
      <header className="pb-6 border-b-2 border-black">
        <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
          INBOX
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
          Kotak Masuk
        </h1>
        <p className="text-slate-600 text-xs font-semibold mt-1">
          Kelola undangan workspace &amp; negosiasi langsung dengan klien atau desainer tanpa meninggalkan platform.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-2 border-black shadow-brutalist-xs">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors border-r border-black last:border-r-0 cursor-pointer ${
                isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 border border-black shadow-brutalist-xs leading-none ${
                  isActive ? 'bg-accent-orange text-black' : 'bg-rose-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'invites' && (
        <InvitationsTab currentUser={currentUser} userData={userData} />
      )}
      {activeTab === 'dm' && currentUser && (
        <DirectMessagesTab
          currentUser={currentUser}
          initialDmUsername={dmTarget}
        />
      )}
    </div>
  )
}
