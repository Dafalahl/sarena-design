'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileText, CheckCircle2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

export default function WorkspaceNewPage({ params }) {
  const unwrappedParams = params && typeof params.then === 'function' ? use(params) : params;
  const id = unwrappedParams?.id;
  const router = useRouter()
  
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processingState, setProcessingState] = useState(null)
  const [error, setError] = useState(null)
  
  // Custom workspace options
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState(0)
  const [revisions, setRevisions] = useState(3)
  const [brief, setBrief] = useState('')
  const [file, setFile] = useState(null)
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

  // Creation limits
  const [isMember, setIsMember] = useState(false)
  const [inProgressCount, setInProgressCount] = useState(0)

  useEffect(() => {
    async function loadWorkspaceSetup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/workspace/new/' + id)
        return
      }

      // Fetch current user details including is_member status
      const { data: myProfile } = await supabase
        .from('users')
        .select('is_member, full_name, username')
        .eq('id', user.id)
        .single()
      
      const isMem = myProfile?.is_member || false
      setIsMember(isMem)

      const hostDisplayName = myProfile?.username || myProfile?.full_name || user.email.split('@')[0] || 'My'
      setTitle(`${hostDisplayName} projects`)

      // Count active/pending workspaces for this user
      const { data: activeWS } = await supabase
        .from('workspaces')
        .select('id')
        .or(`client_id.eq.${user.id},creator_id.eq.${user.id},created_by.eq.${user.id}`)
        .in('status', ['pending', 'escrow'])
      
      const activeCount = activeWS ? activeWS.length : 0
      setInProgressCount(activeCount)

      // Fetch the creator being hired from unified users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', id)
        .single()

      if (error || !data) {
        setError("Designer not found.")
        setLoading(false)
        return
      }

      setCreator(data)
      setPrice(data.price_base || 0)

      // Enforce capacity check on the designer being hired (not the buyer client)
      const creatorLimit = data.is_member ? 6 : 2
      const { data: creatorActiveWS } = await supabase
        .from('workspaces')
        .select('id')
        .eq('creator_id', data.id)
        .eq('status', 'escrow')
        .eq('handshake', true)

      const creatorActiveCount = creatorActiveWS ? creatorActiveWS.length : 0
      if (creatorActiveCount >= creatorLimit) {
        setError(`${data.full_name || 'Desainer ini'} saat ini sedang menangani kuota maksimal (${creatorLimit}) proyek aktif. Silakan tunggu hingga proyek selesai.`)
      }

      setLoading(false)
    }
    loadWorkspaceSetup()
  }, [id, router])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("Requirements file exceeds the 10MB limit.")
        e.target.value = null
        setFile(null)
      } else {
        setError(null)
        setFile(selectedFile)
      }
    }
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    setProcessingState('Memproses inisiasi workspace...')
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
      // 1. Upload requirement file if selected
      let requirementsFileUrl = null
      if (file) {
        setProcessingState('Mengunggah dokumen brief...')
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
        const filePath = `briefs/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('workspaces')
          .upload(filePath, file)

        if (uploadError) {
          throw new Error('Gagal mengunggah file brief: ' + uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('workspaces')
          .getPublicUrl(filePath)
        
        requirementsFileUrl = publicUrl
      }

      // 2. Trigger Next.js API route to create workspace proposal
      setProcessingState('Mengajukan permintaan proyek...')
      const res = await fetch('/api/workspace/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          price: parseInt(price),
          revisions: parseInt(revisions),
          brief,
          requirementsFileUrl,
          title: title.trim()
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan proposal workspace')
      }

      setProcessingState('Berhasil! Mengalihkan ke workspace...')
      setProgress(100)
      clearInterval(timer)
      router.push(`/workspace/${data.workspaceId}`)
    } catch (err) {
      clearInterval(timer)
      setProgress(0)
      console.error(err)
      setError(err.message)
      setProcessingState(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center font-mono font-bold text-xs uppercase tracking-wider animate-pulse">
        Memuat data setup workspace...
      </div>
    </div>
  )
  if (error && !creator) return (
    <div className="text-center py-24 text-rose-600 font-mono font-bold text-xs uppercase tracking-wider">
      {error}
    </div>
  )

  const fee = price * 0.1
  const total = Number(price) + fee

  return (
    <>
      {progress > 0 && (
        <div 
          className="fixed top-0 left-0 h-1.5 bg-accent-lime border-b border-black z-[9999] transition-all duration-200 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      )}
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 select-none text-black">
        {/* Navigation Breadcrumb / Back button */}
        <div>
          <Link 
            href={`/${id}`} 
            className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-white px-3 py-1.5 hover:bg-slate-50 shadow-brutalist-xs hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Profil Desainer
          </Link>
        </div>

        {/* Header Title */}
        <div className="border-b-2 border-black pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider shadow-brutalist-sm">
              DIRECT ESCROW HIRE 🚀
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            Inisiasi Proyek Bersama @{creator.username}
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">
            Tentukan ruang lingkup proyek, batasan revisi, dan amankan pembayaran transaksi melalui Escrow Rekber Sarena.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Scope Definition Form */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist">
              <CardHeader className="border-b-2 border-black bg-slate-50 p-5 md:p-6">
                <CardTitle className="text-black text-lg font-black uppercase">Ruang Lingkup &amp; Ketentuan</CardTitle>
                <CardDescription className="text-slate-600 text-xs">Tentukan kebutuhan spesifik dan rincian pekerjaan untuk desainer.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 md:p-6">
                <form onSubmit={handleCheckout} className="space-y-6">
                  
                  {/* Project Title */}
                  <div className="space-y-2 relative">
                    <Label htmlFor="title" className="text-black text-xs font-bold uppercase tracking-wider">Judul Proyek</Label>
                    <Input
                      id="title"
                      name="title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Desain Logo & Identitas Brand"
                      className="font-bold"
                    />
                    <div className="flex justify-end mt-1">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="text-[10px] font-mono font-bold text-slate-600 hover:text-black underline cursor-pointer"
                        >
                          Butuh saran judul?
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

                  {/* Price (Editable) */}
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-black text-xs font-bold uppercase tracking-wider">Nominal Kesepakatan (IDR)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-black font-bold font-mono text-sm">Rp</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        required
                        min="10000"
                        step="5000"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-10 font-mono font-bold"
                        placeholder="500000"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Otomatis terisi tarif dasar desainer. Anda dapat menyesuaikannya bila telah ada kesepakatan nominal khusus.
                    </p>
                  </div>

                  {/* Revisions */}
                  <div className="space-y-2">
                    <Label htmlFor="revisions" className="text-black text-xs font-bold uppercase tracking-wider">Maksimal Putaran Revisi</Label>
                    <Input
                      id="revisions"
                      name="revisions"
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={revisions}
                      onChange={(e) => setRevisions(e.target.value)}
                      className="font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Batas jumlah iterasi/revisi minor yang dapat diajukan sebelum serah terima final.
                    </p>
                  </div>

                  {/* Briefing Text */}
                  <div className="space-y-2">
                    <Label htmlFor="brief" className="text-black text-xs font-bold uppercase tracking-wider">Deskripsi Brief Pekerjaan</Label>
                    <Textarea
                      id="brief"
                      name="brief"
                      rows={4}
                      required
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      className="min-h-[100px] resize-none font-medium text-slate-800"
                      placeholder="Jelaskan kebutuhan desain Anda, gaya visual yang diinginkan, dimensi, atau referensi desain..."
                    />
                  </div>

                  {/* File Upload (Brief Requirements) */}
                  <div className="space-y-2">
                    <Label className="text-black text-xs font-bold uppercase tracking-wider">Lampiran Dokumen/Aset Brief (Maks 10MB)</Label>
                    <div className="border-[3px] border-dashed border-black hover:bg-slate-50 transition-colors rounded-none p-8 flex flex-col items-center justify-center cursor-pointer relative bg-[#FAF9F6] shadow-brutalist-sm group">
                      <input 
                        type="file" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      />
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-black transition-colors mb-2 shrink-0" />
                      {file ? (
                        <div className="text-center">
                          <p className="text-xs font-bold text-black flex items-center justify-center gap-1.5 font-mono">
                            <FileText className="w-4 h-4 text-accent-purple" />
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB - Siap diunggah</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-black font-bold uppercase tracking-wider">Klik atau tarik file brief ke sini (PDF, ZIP, Gambar)</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">Mendukung format file hingga batas 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border-2 border-rose-500 text-rose-700 p-4 rounded-none text-xs font-mono font-bold shadow-brutalist-sm">
                      {error}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    variant="default" 
                    className="w-full h-11"
                    disabled={processingState !== null || !!error}
                  >
                    {processingState || (error ? 'Periksa Peringatan Di Atas' : "Kirim Permintaan Proyek ke Desainer")}
                  </Button>
                  <p className="text-[10px] font-mono text-center text-slate-500 mt-2">
                    💡 Desainer akan meninjau brief terlebih dahulu. Pembayaran Escrow baru dilakukan setelah desainer menyetujui.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Trust Indicators */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden">
              <CardHeader className="border-b-2 border-black bg-slate-50 p-5">
                <CardTitle className="text-black text-sm font-black uppercase">Ringkasan Biaya Escrow</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                
                <div className="flex items-center space-x-4 bg-[#FAF9F6] p-4 border-2 border-black rounded-none shadow-brutalist-sm">
                  <UserAvatar
                    src={creator.avatar_url}
                    name={creator.full_name || creator.username}
                    email={creator.email}
                    className="w-12 h-12 rounded-none border border-black shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest leading-none mb-1">Desainer Ditunjuk</p>
                    <h3 className="text-xs font-black uppercase text-black leading-tight truncate">{creator.full_name || creator.username}</h3>
                    <p className="text-accent-purple font-mono text-[10px] font-bold uppercase tracking-wider">@{creator.username}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2 font-mono text-xs font-bold uppercase tracking-wider">
                  <div className="flex justify-between items-center text-black">
                    <span>Nominal Proyek</span>
                    <span>Rp {Number(price).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Biaya Platform Escrow (10%)</span>
                    <span>Rp {fee.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <Separator className="bg-black h-0.5" />

                <div className="flex justify-between items-center text-black font-mono font-black text-sm uppercase tracking-wider">
                  <span>Total Tagihan Escrow</span>
                  <span className="bg-accent-lime border border-black px-2 py-0.5 shadow-brutalist-sm">Rp {total.toLocaleString('id-ID')}</span>
                </div>

                <div className="p-4 bg-accent-yellow border-2 border-black rounded-none shadow-brutalist-sm space-y-3 text-black">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      Alur Aman Rekber Sarena
                    </p>
                    <span className="text-[9px] font-mono font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wider">
                      100% Proteksi
                    </span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">1</span>
                      <p className="text-[11px] leading-tight font-semibold">Dana tersimpan aman di rekening Escrow saat pembayaran berhasil.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">2</span>
                      <p className="text-[11px] leading-tight font-semibold">Desainer mulai bekerja &amp; mengunggah hasil revisi di Workspace.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-none border border-black bg-white flex items-center justify-center font-mono font-black text-[10px] shrink-0 shadow-brutalist-xs">3</span>
                      <p className="text-[11px] leading-tight font-semibold">Dana baru dicairkan ke desainer setelah Anda menyetujui hasil akhir.</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
