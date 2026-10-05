'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Briefcase, Users, HelpCircle, ShieldCheck, User, Palette, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function CreateWorkspacePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Form states
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [amount, setAmount] = useState(500000)
  const [revisions, setRevisions] = useState(3)
  const [recipientType, setRecipientType] = useState('invite') // 'invite' or 'public'
  const [userList, setUserList] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [progress, setProgress] = useState(0)
  const titleSuggestions = [
    "Desain Logo & Identitas Brand",
    "Desain UI/UX Website",
    "Ilustrasi Karakter & Maskot",
    "Desain Kemasan & Packaging",
    "Desain Feed & Banner Promosi",
    "Desain Poster & Merchandise",
  ]
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Dual Tagging states
  const [clients, setClients] = useState([])
  const [designers, setDesigners] = useState([])
  const [clientInput, setClientInput] = useState('')
  const [designerInput, setDesignerInput] = useState('')

  // Host role toggle & limit states
  const [hostRole, setHostRole] = useState(null)
  const [meProfile, setMeProfile] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [inProgressCount, setInProgressCount] = useState(0)

  useEffect(() => {
    async function initPage() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setCurrentUser(user)

        // Fetch user list (including is_member status)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email, role, username, price_base, is_member')
          .neq('id', user.id)
        
        setUserList(usersData || [])

        // Fetch current user details including is_member status and role
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, full_name, email, role, username, price_base, is_member')
          .eq('id', user.id)
          .single()

        const meUser = userProfile || { id: user.id, email: user.email, full_name: 'Me', username: 'me', role: 'client', is_member: false }
        setMeProfile(meUser)

        const isMem = meUser.is_member || false
        setIsMember(isMem)

        const hostDisplayName = meUser.username || meUser.full_name || meUser.email.split('@')[0] || 'My'
        setTitle(`${hostDisplayName} projects`)

        // Set role based on user's registered account profile
        const userIsCreator = meUser.role === 'creator'
        const initialRole = userIsCreator ? 'designer' : 'client'
        setHostRole(initialRole)

        if (initialRole === 'designer') {
          setDesigners([meUser])
          setClients([])
        } else {
          setClients([meUser])
          setDesigners([])
        }

        // Count active workspaces for this user as a designer
        const { data: activeWS } = await supabase
          .from('workspaces')
          .select('id')
          .eq('creator_id', user.id)
          .eq('status', 'escrow')
          .eq('handshake', true)
        
        const activeCount = activeWS ? activeWS.length : 0
        setInProgressCount(activeCount)

        if (userIsCreator) {
          const limit = isMem ? 6 : 2
          if (activeCount >= limit) {
            setError(`Kapasitas desainer penuh. Anda saat ini menangani ${activeCount} proyek aktif (${isMem ? 'Maksimal 6 untuk Creator Pro' : 'Maksimal 2 untuk akun standar'}).`)
          }
        }
      } catch (err) {
        console.error(err)
        setError("Failed to load page context.")
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [router])

  useEffect(() => {
    // Automatically set budget based on the maximum price of the invited designers
    const invitedDesigners = designers.filter(d => currentUser && d.id !== currentUser.id)
    if (invitedDesigners.length > 0) {
      const maxPrice = Math.max(...invitedDesigners.map(u => u.price_base || 0))
      if (maxPrice > 0) {
        setAmount(maxPrice)
      }
    }
  }, [designers, currentUser])

  const handleAddClient = (inputValue) => {
    setError(null)
    const cleaned = inputValue.trim().replace(/^@/, '')
    if (!cleaned) return

    if (clients.length >= 5) {
      setError("Maximum of 5 clients allowed.")
      return
    }

    const found = userList.find(
      u => (u.username && u.username.toLowerCase() === cleaned.toLowerCase()) || 
           (u.email && u.email.toLowerCase() === cleaned.toLowerCase())
    )

    if (!found) {
      setError(`Client "${inputValue}" not found.`)
      return
    }

    if (clients.some(u => u.id === found.id)) {
      setError("Client is already added.")
      return
    }

    setClients([...clients, found])
    setClientInput('')
  }

  const handleRoleChange = (newRole) => {
    if (hostRole === newRole || !meProfile) return
    setError(null)

    const updateState = () => {
      setHostRole(newRole)
      if (newRole === 'designer') {
        // Switch to designer mode
        setDesigners([meProfile])
        setClients([])
      } else {
        // Switch to client mode
        setClients([meProfile])
        setDesigners([])
      }
    }

    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(updateState)
    } else {
      updateState()
    }
  }

  const handleRemoveClient = (clientId) => {
    // Protect removing self if you are the host client
    if (currentUser && clientId === currentUser.id && hostRole === 'client') {
      setError("You cannot remove yourself from the workspace.")
      return
    }
    setClients(clients.filter(c => c.id !== clientId))
  }

  const handleAddDesigner = async (inputValue) => {
    setError(null)
    const cleaned = inputValue.trim().replace(/^@/, '')
    if (!cleaned) return

    if (designers.length >= 5) {
      setError("Maksimal 5 desainer.")
      return
    }

    const found = userList.find(
      u => (u.username && u.username.toLowerCase() === cleaned.toLowerCase()) || 
           (u.email && u.email.toLowerCase() === cleaned.toLowerCase())
    )

    if (!found) {
      setError(`Desainer "${inputValue}" tidak ditemukan.`)
      return
    }

    if (designers.some(u => u.id === found.id)) {
      setError("Desainer sudah ditambahkan.")
      return
    }

    // Check capacity of invited designer
    const dLimit = found.is_member ? 6 : 2
    const { data: dActiveWS } = await supabase
      .from('workspaces')
      .select('id')
      .eq('creator_id', found.id)
      .eq('status', 'escrow')
      .eq('handshake', true)

    const dCount = dActiveWS ? dActiveWS.length : 0
    if (dCount >= dLimit) {
      setError(`Desainer @${found.username || found.full_name} saat ini sedang menangani kuota maksimal (${dLimit}) proyek aktif. Silakan pilih desainer lain atau tunggu hingga proyeknya selesai.`)
      return
    }

    setDesigners([...designers, found])
    setDesignerInput('')
  }

  const handleRemoveDesigner = (designerId) => {
    // Protect removing self if you are the host designer
    if (currentUser && designerId === currentUser.id && hostRole === 'designer') {
      setError("You cannot remove yourself from the workspace.")
      return
    }
    setDesigners(designers.filter(d => d.id !== designerId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Please provide a project title.")
      return
    }
    if (!brief.trim()) {
      setError("Please provide a workspace brief/description.")
      return
    }

    if (hostRole === 'designer') {
      const limit = isMember ? 6 : 2
      if (inProgressCount >= limit) {
        setError(`Batas kuota proyek desainer tercapai (${inProgressCount}/${limit}). Upgrade ke Creator Pro pada halaman Membership untuk meningkatkan kuota hingga 6 proyek.`)
        return
      }
    }

    if (recipientType === 'invite') {
      if (clients.length === 0) {
        setError("Please add at least one client.")
        return
      }
      if (designers.length === 0) {
        setError("Please add at least one designer.")
        return
      }
    }

    setSubmitting(true)
    setError(null)
    setProgress(15)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer)
          return 90
        }
        return prev + 5
      })
    }, 150)

    try {
      const invitedDesigners = designers.filter(d => currentUser && d.id !== currentUser.id)
      const maxPrice = invitedDesigners.length > 0 ? Math.max(...invitedDesigners.map(u => u.price_base || 0)) : 0
      const isNego = recipientType === 'invite' && maxPrice > 0 && parseInt(amount || 0, 10) < maxPrice
      const finalTitle = isNego ? `[NEGO] ${title.trim()}` : title.trim()

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients,
          designers,
          recipientType,
          title: finalTitle,
          brief: brief.trim(),
          amount: parseInt(amount, 10),
          revisions: parseInt(revisions, 10)
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setProgress(100)
      clearInterval(timer)
      router.push('/dashboard')
    } catch (err) {
      clearInterval(timer)
      setProgress(0)
      console.error(err)
      setError(err.message || "Failed to create workspace.")
      setSubmitting(false)
    }
  }

  // Suggestions search list
  const clientSuggestions = clientInput.trim()
    ? userList.filter(u => {
        const search = clientInput.trim().replace(/^@/, '').toLowerCase()
        return (
          (u.username && u.username.toLowerCase().includes(search)) ||
          (u.full_name && u.full_name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search))
        ) && !clients.some(invited => invited.id === u.id)
      }).slice(0, 5)
    : []

  const designerSuggestions = designerInput.trim()
    ? userList.filter(u => {
        const search = designerInput.trim().replace(/^@/, '').toLowerCase()
        return (
          (u.username && u.username.toLowerCase().includes(search)) ||
          (u.full_name && u.full_name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search))
        ) && !designers.some(invited => invited.id === u.id)
      }).slice(0, 5)
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
          Loading creation panel...
        </div>
      </div>
    )
  }

  return (
    <>
      {progress > 0 && (
        <div 
          className="fixed top-0 left-0 h-1.5 bg-accent-lime border-b border-black z-[9999] transition-all duration-200 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      )}
      <div className="max-w-2xl mx-auto px-4 py-8 text-black">
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-white px-3 py-1.5 hover:bg-slate-50 shadow-brutalist-sm hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutalist-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden relative">
        <CardHeader className="relative z-10 border-b-2 border-black pb-4">
          <CardTitle className="text-2xl font-black uppercase tracking-tight text-black">
            Workspace Setup
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold mt-1">
            Set the terms, select your role, and invite collaborators. Let's make it happen.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border-2 border-black bg-accent-orange p-3 text-xs font-bold uppercase tracking-wide font-mono">
                {error}
              </div>
            )}

            {/* 1. Contextual Identity & Mode Banner */}
            <div>
              {meProfile?.role === 'client' ? (
                /* Client Account: Locked in Client Mode */
                <div className="bg-slate-50 border-2 border-black p-4 shadow-brutalist-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border-2 border-black bg-accent-lime flex items-center justify-center font-black text-sm shadow-brutalist-xs shrink-0">
                      <User className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black uppercase text-black">Peran Anda: Klien (Pemberi Kerja)</p>
                        <span className="text-[8px] font-mono font-bold bg-accent-lime text-black border border-black px-1.5 py-0.5 uppercase">
                          Bebas Kuota
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                        Anda membuat pesanan untuk menyewa desainer. Klien dapat membuat proyek sebanyak-banyaknya tanpa batasan.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Creator Account: Designer Mode by default with Client Mode switch */
                <div className="bg-slate-50 border-2 border-black p-4 shadow-brutalist-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black text-sm shadow-brutalist-xs shrink-0 ${
                        hostRole === 'designer' ? 'bg-accent-purple text-white' : 'bg-accent-lime text-black'
                      }`}>
                        {hostRole === 'designer' ? <Palette className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase text-black">
                            {hostRole === 'designer' ? 'Peran Anda: Desainer (Penyedia Jasa)' : 'Peran Sementara: Klien (Menyewa Desainer)'}
                          </p>
                          {hostRole === 'designer' && (
                            <span className="text-[8px] font-mono font-bold bg-white text-black border border-black px-1.5 py-0.5 uppercase">
                              Kuota: {inProgressCount}/{isMember ? 6 : 2} Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                          {hostRole === 'designer'
                            ? 'Membuatkan workspace & draft kesepakatan langsung untuk klien Anda.'
                            : 'Anda beralih peran sebagai pembeli untuk menyewa rekan sesama desainer.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRoleChange(hostRole === 'designer' ? 'client' : 'designer')}
                      className="text-[10px] font-mono font-bold border-2 border-black bg-white hover:bg-slate-100 px-3 py-1.5 uppercase shadow-brutalist-xs transition-transform active:translate-y-0.5 shrink-0"
                    >
                      {hostRole === 'designer' ? 'Sewa Desainer Lain? Beralih Mode →' : 'Kembali ke Mode Desainer →'}
                    </button>
                  </div>

                  {/* Over-capacity warning for designer */}
                  {hostRole === 'designer' && inProgressCount >= (isMember ? 6 : 2) && (
                    <div className="p-3 bg-accent-orange/20 border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black">
                      <div className="text-[11px] font-semibold leading-tight">
                        <p className="font-black uppercase text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-accent-orange shrink-0" />
                          Batas Kuota Proyek Desainer Penuh ({inProgressCount}/{isMember ? 6 : 2})
                        </p>
                        <p className="text-slate-700 mt-1">
                          {isMember 
                            ? 'Anda telah mencapai kuota maksimal 6 proyek Creator Pro. Selesaikan salah satu proyek aktif untuk membuka slot baru.' 
                            : 'Akun standar dibatasi maksimal 2 proyek aktif. Tingkatkan ke Sarena Creator Pro untuk menangani hingga 6 proyek sekaligus!'}
                        </p>
                      </div>
                      {!isMember && (
                        <Link href="/membership" className="shrink-0">
                          <Button size="sm" className="h-8 bg-black text-white hover:bg-slate-800 text-[10px] uppercase font-mono font-black border border-black shadow-brutalist-xs">
                            Upgrade ke Pro →
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Collaborators Tagging (Auto-expanded) */}
              <div className="mt-6 space-y-6">
                {hostRole === 'client' ? (
                  <>
                    {/* Designer Tagging (Primary for Client) */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="designers-tag" className="text-xs font-black uppercase tracking-wider block flex items-center justify-between">
                        <span>Pilih Desainer yang Ingin Disewa (Wajib)</span>
                        <span className="text-[9px] font-mono text-slate-500 font-normal">Cari berdasarkan @username atau email desainer</span>
                      </Label>
                      <div className="w-full min-h-12 border-2 border-black bg-white rounded-none p-2 flex flex-wrap gap-2 items-center">
                        {designers.map((user) => (
                          <span
                            key={`${user.id}-designer`}
                            className="bg-accent-purple text-white font-mono font-bold text-xs px-2.5 py-1 border border-black shadow-brutalist-sm flex items-center gap-1.5 select-none"
                          >
                            @{user.username || user.email.split('@')[0]}
                            <button
                              type="button"
                              onClick={() => handleRemoveDesigner(user.id)}
                              className="text-white hover:text-accent-orange font-black text-xs cursor-pointer ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        
                        {designers.length < 5 && (
                          <input
                            id="designers-tag"
                            type="text"
                            value={designerInput}
                            onChange={(e) => setDesignerInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddDesigner(designerInput)
                              }
                            }}
                            placeholder="Ketik @username desainer lalu tekan Enter..."
                            className="flex-1 min-w-[200px] border-none bg-transparent outline-none p-1 text-xs font-bold font-mono placeholder-slate-400"
                          />
                        )}
                      </div>

                      {designerSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-black z-30 shadow-brutalist divide-y divide-black max-h-48 overflow-y-auto">
                          {designerSuggestions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleAddDesigner(u.username || u.email)}
                              className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold hover:bg-accent-lime hover:text-black transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-black font-black">@{u.username || u.email.split('@')[0]}</span>
                                <span className="text-[10px] text-slate-500 font-sans">{u.full_name}</span>
                              </div>
                              <span className="text-[9px] border border-black bg-slate-50 text-slate-500 px-1.5 py-0.5">
                                Rp {Number(u.price_base || 0).toLocaleString('id-ID')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Client & Stakeholders Tagging (Secondary for Client) */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="clients-tag" className="text-xs font-black uppercase tracking-wider block flex items-center justify-between">
                        <span>Pihak Klien &amp; Stakeholder Tambahan (Opsional)</span>
                        <span className="text-[9px] font-mono text-slate-500 font-normal">Anda otomatis terdaftar sebagai Klien Utama</span>
                      </Label>
                      <div className="w-full min-h-12 border-2 border-black bg-white rounded-none p-2 flex flex-wrap gap-2 items-center">
                        {clients.map((user) => {
                          const isMe = currentUser && user.id === currentUser.id
                          return (
                            <span
                              key={`${user.id}-client`}
                              className="bg-accent-lime text-black font-mono font-bold text-xs px-2.5 py-1 border border-black shadow-brutalist-sm flex items-center gap-1.5 select-none"
                            >
                              @{user.username || user.email.split('@')[0]} {isMe && "(Anda - Klien)"}
                              {!isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClient(user.id)}
                                  className="text-black hover:text-accent-orange font-black text-xs cursor-pointer ml-1"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          )
                        })}
                        
                        {clients.length < 5 && (
                          <input
                            id="clients-tag"
                            type="text"
                            value={clientInput}
                            onChange={(e) => setClientInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddClient(clientInput)
                              }
                            }}
                            placeholder="Tag stakeholder tambahan via @username..."
                            className="flex-1 min-w-[150px] border-none bg-transparent outline-none p-1 text-xs font-bold font-mono placeholder-slate-400"
                          />
                        )}
                      </div>

                      {clientSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-black z-30 shadow-brutalist divide-y divide-black max-h-48 overflow-y-auto">
                          {clientSuggestions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setClients([...clients, u])
                                setClientInput('')
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold hover:bg-accent-lime hover:text-black transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-black font-black">@{u.username || u.email.split('@')[0]}</span>
                                <span className="text-[10px] text-slate-500 font-sans">{u.full_name}</span>
                              </div>
                              <span className="text-[9px] border border-black bg-slate-50 text-slate-500 px-1.5 py-0.5">
                                {u.email}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Client Tagging (Primary for Designer) */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="clients-tag" className="text-xs font-black uppercase tracking-wider block flex items-center justify-between">
                        <span>Pilih Klien Pemesan Proyek (Wajib)</span>
                        <span className="text-[9px] font-mono text-slate-500 font-normal">Cari berdasarkan @username atau email klien</span>
                      </Label>
                      <div className="w-full min-h-12 border-2 border-black bg-white rounded-none p-2 flex flex-wrap gap-2 items-center">
                        {clients.map((user) => (
                          <span
                            key={`${user.id}-client`}
                            className="bg-accent-lime text-black font-mono font-bold text-xs px-2.5 py-1 border border-black shadow-brutalist-sm flex items-center gap-1.5 select-none"
                          >
                            @{user.username || user.email.split('@')[0]}
                            <button
                              type="button"
                              onClick={() => handleRemoveClient(user.id)}
                              className="text-black hover:text-accent-orange font-black text-xs cursor-pointer ml-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        
                        {clients.length < 5 && (
                          <input
                            id="clients-tag"
                            type="text"
                            value={clientInput}
                            onChange={(e) => setClientInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddClient(clientInput)
                              }
                            }}
                            placeholder="Ketik @username klien lalu tekan Enter..."
                            className="flex-1 min-w-[200px] border-none bg-transparent outline-none p-1 text-xs font-bold font-mono placeholder-slate-400"
                          />
                        )}
                      </div>

                      {clientSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-black z-30 shadow-brutalist divide-y divide-black max-h-48 overflow-y-auto">
                          {clientSuggestions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setClients([...clients, u])
                                setClientInput('')
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold hover:bg-accent-lime hover:text-black transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-black font-black">@{u.username || u.email.split('@')[0]}</span>
                                <span className="text-[10px] text-slate-500 font-sans">{u.full_name}</span>
                              </div>
                              <span className="text-[9px] border border-black bg-slate-50 text-slate-500 px-1.5 py-0.5">
                                {u.email}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Designer & Collaborators Tagging (Secondary for Designer) */}
                    <div className="space-y-2 relative">
                      <Label htmlFor="designers-tag" className="text-xs font-black uppercase tracking-wider block flex items-center justify-between">
                        <span>Desainer &amp; Rekan Kolaborator (Opsional)</span>
                        <span className="text-[9px] font-mono text-slate-500 font-normal">Anda otomatis terdaftar sebagai Desainer Utama</span>
                      </Label>
                      <div className="w-full min-h-12 border-2 border-black bg-white rounded-none p-2 flex flex-wrap gap-2 items-center">
                        {designers.map((user) => {
                          const isMe = currentUser && user.id === currentUser.id
                          return (
                            <span
                              key={`${user.id}-designer`}
                              className="bg-accent-purple text-white font-mono font-bold text-xs px-2.5 py-1 border border-black shadow-brutalist-sm flex items-center gap-1.5 select-none"
                            >
                              @{user.username || user.email.split('@')[0]} {isMe && "(Anda - Desainer)"}
                              {!isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDesigner(user.id)}
                                  className="text-white hover:text-accent-orange font-black text-xs cursor-pointer ml-1"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          )
                        })}
                        
                        {designers.length < 5 && (
                          <input
                            id="designers-tag"
                            type="text"
                            value={designerInput}
                            onChange={(e) => setDesignerInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddDesigner(designerInput)
                              }
                            }}
                            placeholder="Tag rekan desainer tambahan via @username..."
                            className="flex-1 min-w-[150px] border-none bg-transparent outline-none p-1 text-xs font-bold font-mono placeholder-slate-400"
                          />
                        )}
                      </div>

                      {designerSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-black z-30 shadow-brutalist divide-y divide-black max-h-48 overflow-y-auto">
                          {designerSuggestions.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleAddDesigner(u.username || u.email)}
                              className="w-full px-4 py-2.5 text-left text-xs font-mono font-bold hover:bg-accent-lime hover:text-black transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-black font-black">@{u.username || u.email.split('@')[0]}</span>
                                <span className="text-[10px] text-slate-500 font-sans">{u.full_name}</span>
                              </div>
                              <span className="text-[9px] border border-black bg-slate-50 text-slate-500 px-1.5 py-0.5">
                                {u.email}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 4. Project Title */}
            <div className="space-y-2 relative border-t-2 border-dashed border-black pt-6">
              <Label htmlFor="title" className="text-xs font-black uppercase tracking-wider block">Project Title (Keep it snappy)</Label>
              <Input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clean Logo V2, E-commerce Redesign..."
                className="font-bold text-xs"
              />
              <div className="flex justify-end mt-1">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-[10px] font-mono font-bold text-slate-600 hover:text-black underline cursor-pointer"
                  >
                    Need suggestion?
                  </button>
                  {showSuggestions && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border-2 border-black z-50 shadow-brutalist divide-y divide-black">
                      {titleSuggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setTitle(sug)
                            setShowSuggestions(false)
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-mono font-bold hover:bg-accent-lime hover:text-black transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Budget & Revisions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-black uppercase tracking-wider block">Agreed Price (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="10000"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono font-bold"
                />
                
                {/* Rupiah Formatting Preview & NEGO badge */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-500">
                    Format: Rp {parseInt(amount || 0, 10).toLocaleString('id-ID')}
                  </span>
                  {(() => {
                    const invitedDesigners = designers.filter(d => currentUser && d.id !== currentUser.id)
                    const maxPrice = invitedDesigners.length > 0 ? Math.max(...invitedDesigners.map(u => u.price_base || 0)) : 0;
                    const isNego = maxPrice > 0 && parseInt(amount || 0, 10) < maxPrice;
                    if (isNego) {
                      return (
                        <span className="bg-accent-orange text-black font-mono font-black text-[9px] px-1.5 py-0.5 border border-black shadow-brutalist-sm uppercase tracking-wider ml-1.5 animate-pulse">
                          NEGO WORKSPACE
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revisions" className="text-xs font-black uppercase tracking-wider block">Max Revision Rounds</Label>
                <Input
                  id="revisions"
                  type="number"
                  min="0"
                  max="20"
                  value={revisions}
                  onChange={(e) => setRevisions(e.target.value)}
                  className="font-mono font-bold"
                />
              </div>
            </div>

            {/* 6. Workspace Brief */}
            <div className="space-y-2">
              <Label htmlFor="brief" className="text-xs font-black uppercase tracking-wider block">What are we making? (Brief)</Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Drop the brief details here. Style guides, dimensions, references, do's & don'ts..."
                className="h-28"
              />
            </div>

            {/* Alur Aman Rekber banner */}
            <div className="p-4 bg-accent-yellow border-2 border-black rounded-none shadow-brutalist-sm space-y-3 text-black">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  Alur Aman Rekber
                </p>
                <span className="text-[9px] font-mono font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wider">
                  100% Proteksi
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">1</span>
                  <p className="text-[11px] leading-tight font-semibold">Dana aman tersimpan di platform saat pembayaran selesai.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">2</span>
                  <p className="text-[11px] leading-tight font-semibold">Desainer mengerjakan pesanan &amp; upload hasil kerja di Workspace.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">3</span>
                  <p className="text-[11px] leading-tight font-semibold">Dana dicairkan ke desainer hanya setelah Anda puas &amp; menyetujui hasil.</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || (hostRole === 'designer' && inProgressCount >= (isMember ? 6 : 2))}
              className="w-full h-12 text-sm uppercase tracking-widest font-black"
            >
              {submitting ? 'Membuat Workspace...' : (hostRole === 'designer' && inProgressCount >= (isMember ? 6 : 2)) ? 'Batas Desainer Tercapai (Upgrade ke Pro)' : "Buat Workspace & Mulai Transaksi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
