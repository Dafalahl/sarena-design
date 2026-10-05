'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import Link from 'next/link'

export default function MembershipPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          const { data, error } = await supabase
            .from('users')
            .select('is_member')
            .eq('id', user.id)
            .single()
          
          if (!error && data) {
            setIsMember(data.is_member || false)
          }
        }
      } catch (err) {
        console.error("Failed to load user membership details:", err)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handlePlanAction = async (planName) => {
    if (!currentUser) {
      window.location.href = '/login'
      return
    }

    if (planName === "Sarena Creator Pro") {
      setUpdating(true)
      try {
        const res = await fetch('/api/membership/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || "Gagal membuat sesi pembayaran.")
        }
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        }
      } catch (err) {
        console.error(err)
        alert("Gagal melanjutkan ke pembayaran: " + err.message)
        setUpdating(false)
      }
      return
    }

    // Downgrade to basic
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_member: false })
        .eq('id', currentUser.id)
      
      if (error) throw error
      setIsMember(false)
    } catch (err) {
      console.error(err)
      alert("Gagal memperbarui status membership: " + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const plans = [
    {
      name: "Sarena Basic",
      price: "Free",
      desc: "Paket standar untuk desainer pemula dan semua klien.",
      features: [
        "Tangani hingga 2 proyek aktif sekaligus (Desainer)",
        "Upload file & aset karya hingga 10MB",
        "Klien/Pembeli: Bebas order tanpa batasan kuota",
        "Proteksi transaksi aman via Sarena Escrow"
      ],
      cta: "Mulai Sekarang",
      popular: false
    },
    {
      name: "Sarena Creator Pro",
      price: "Rp 99.000 / bln",
      desc: "Tingkatkan kapasitas kerja bagi desainer profesional & agensi.",
      features: [
        "Tangani hingga 6 proyek aktif sekaligus",
        "Upload file & aset karya hingga 100MB",
        "Badge profil Verified Professional & Explore PRO",
        "Prioritas pencarian di direktori Explore",
        "Proteksi penuh Escrow Rekber",
        "Dukungan prioritas tim Sarena 24/7"
      ],
      cta: "Bayar & Upgrade ke Pro",
      popular: true
    },
    {
      name: "Sarena Enterprise",
      price: "Custom",
      desc: "Solusi kustom untuk studio kreatif, agensi besar, dan tim desain.",
      features: [
        "Kapasitas kuota & ruang penyimpanan kustom",
        "Dedicated account manager & bantuan mediasi",
        "Integrasi API & faktur kustom",
        "Struktur fee fleksibel untuk volume tinggi"
      ],
      cta: "Hubungi Kami",
      popular: false
    }
  ]

  const renderCTAButton = (plan) => {
    if (loading) {
      return (
        <Button variant="secondary" className="w-full text-xs font-bold rounded-none h-11" disabled>
          Checking Status...
        </Button>
      )
    }

    if (!currentUser) {
      if (plan.name === "Sarena Enterprise") {
        return (
          <Link href="/contact" className="w-full">
            <Button variant="secondary" className="w-full text-xs font-bold rounded-none h-11">
              Contact Sales
            </Button>
          </Link>
        )
      }
      return (
        <Link href="/login" className="w-full">
          <Button 
            variant={plan.popular ? 'primary' : 'secondary'} 
            className="w-full text-xs font-bold rounded-none h-11"
          >
            {plan.cta}
          </Button>
        </Link>
      )
    }

    // Authenticated user
    if (plan.name === "Sarena Basic") {
      if (!isMember) {
        return (
          <Button 
            variant="secondary" 
            className="w-full text-xs font-bold rounded-none h-11 bg-black text-white hover:bg-black/90 cursor-default"
            disabled
          >
            Current Plan
          </Button>
        )
      }
      return (
        <Button 
          variant="secondary" 
          className="w-full text-xs font-bold rounded-none h-11 border-2 border-black bg-white hover:bg-slate-50 text-black shadow-brutalist-sm"
          onClick={() => handlePlanAction("Sarena Basic")}
          disabled={updating}
        >
          {updating ? "Downgrading..." : "Downgrade to Basic"}
        </Button>
      )
    }

    if (plan.name === "Sarena Creator Pro") {
      if (isMember) {
        return (
          <Button 
            variant="primary" 
            className="w-full text-xs font-bold rounded-none h-11 bg-accent-lime text-black border-2 border-black shadow-brutalist-sm cursor-default"
            disabled
          >
            Current Plan (Pro Active)
          </Button>
        )
      }
      return (
        <Button 
          variant="primary" 
          className="w-full text-xs font-bold rounded-none h-11 bg-accent-purple hover:bg-accent-purple/95 border-2 border-black text-white shadow-brutalist-sm"
          onClick={() => handlePlanAction("Sarena Creator Pro")}
          disabled={updating}
        >
          {updating ? "Upgrading..." : "Upgrade to Pro"}
        </Button>
      )
    }

    // Enterprise
    return (
      <Link href="/contact" className="w-full">
        <Button variant="secondary" className="w-full text-xs font-bold rounded-none h-11">
          Contact Sales
        </Button>
      </Link>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 text-black select-none">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider py-2 px-3 border-2 border-black bg-white hover:bg-slate-100 shadow-brutalist-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-block border border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-brutalist-sm">
          PRICING &amp; PLANS
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[0.95]">
          Flexible Memberships
        </h1>
        <p className="text-sm font-bold text-slate-700">
          Scale your workload limits, file sizes, and priority discoverability as a top-tier designer or agency.
        </p>
      </div>

      {/* Buyer Guarantee Note */}
      <div className="bg-accent-lime/20 border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-black shadow-brutalist-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border-2 border-black bg-accent-lime flex items-center justify-center font-black text-sm shrink-0">
            ✓
          </div>
          <div>
            <p className="text-xs font-black uppercase text-black">Untuk Klien &amp; Pembeli: 100% Selalu Bebas Biaya Langganan</p>
            <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
              Klien dapat membuat pesanan dan menyewa desainer sebanyak-banyaknya tanpa batasan kuota. Paket langganan Creator Pro hanya diperuntukkan bagi desainer yang ingin meningkatkan kapasitas proyek aktif.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
        {plans.map((plan, i) => (
          <div 
            key={i} 
            className={`bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden flex flex-col justify-between relative transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm ${
              plan.popular ? 'ring-4 ring-accent-lime/20 md:-mt-4' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 left-0 bg-accent-lime text-black border-b-2 border-black text-center py-2 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 z-10 shadow-brutalist-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Most Popular Choice
              </div>
            )}
            
            <CardHeader className={`p-6 md:p-8 space-y-4 ${plan.popular ? 'pt-12' : ''}`}>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black uppercase tracking-tight">{plan.name}</h3>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">{plan.desc}</p>
              </div>
              <div className="pt-2 border-b-2 border-black pb-4">
                <span className="text-2xl font-black tracking-tight uppercase font-mono">{plan.price}</span>
              </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 pt-0 flex-1 flex flex-col justify-between space-y-8">
              <ul className="space-y-4">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs font-bold text-black font-sans">
                    <div className="w-4.5 h-4.5 border-2 border-black bg-accent-lime text-black flex items-center justify-center shrink-0 mt-0.5 shadow-brutalist-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="pt-0.5">{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-6 flex justify-center">
                {renderCTAButton(plan)}
              </div>
            </CardContent>
          </div>
        ))}
      </div>

      {/* Safety Notice */}
      <div className="max-w-3xl mx-auto bg-accent-yellow border-3 border-black rounded-none p-6 flex items-start gap-4 shadow-brutalist">
        <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-black shadow-brutalist-sm shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider">100% Escrow Protection Guaranteed</h4>
          <p className="text-xs text-black font-semibold leading-relaxed">
            Regardless of your plan, Sarena legally secures every single workspace transaction. No payments are released to creators until delivery satisfies client requirements.
          </p>
        </div>
      </div>
    </div>
  )
}
