'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, QrCode, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function MembershipSimulatorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const amountStr = searchParams.get('amount') || '99000'
  const amountNum = parseInt(amountStr, 10) || 99000

  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleSimulatePayment = async () => {
    if (!orderId) {
      setError("Order ID tidak ditemukan.")
      return
    }

    setPaying(true)
    setError(null)

    try {
      const res = await fetch('/api/webhook/pakasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          order_id: orderId,
          amount: amountNum,
          project: 'sarena',
          payment_method: 'qris_simulator'
        })
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal memproses konfirmasi pembayaran.")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard?membership=success')
      }, 1800)
    } catch (err) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan saat memproses simulasi pembayaran.")
      setPaying(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4 select-none">
      <Card className="bg-white border-[3px] border-black rounded-none shadow-[8px_8px_0px_0px_#000000] overflow-hidden">
        <CardHeader className="bg-slate-50 border-b-2 border-black p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black font-mono uppercase px-2 py-0.5 bg-black text-white">
              Pakasir Payment Gateway
            </span>
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
              Simulator Sandbox
            </span>
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight text-black">
            Pembayaran Sarena Creator Pro
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold mt-1">
            Selesaikan pembayaran QRIS untuk mengaktifkan kapasitas 6 proyek aktif &amp; status Verified Creator.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-500 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-accent-lime border-2 border-black flex items-center justify-center mx-auto shadow-brutalist-sm">
                <CheckCircle2 className="w-10 h-10 text-black stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-black">
                Pembayaran Berhasil!
              </h3>
              <p className="text-xs font-semibold text-slate-600 max-w-sm mx-auto">
                Status akun Anda telah resmi ditingkatkan menjadi <strong className="text-black">Creator Pro</strong>. Mengalihkan ke dashboard...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              </div>
            </div>
          ) : (
            <>
              {/* Payment Info Card */}
              <div className="p-4 border-2 border-black bg-accent-yellow/20 flex justify-between items-center font-mono">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Tagihan</span>
                  <span className="text-2xl font-black text-black">
                    Rp {amountNum.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Order ID</span>
                  <span className="text-[10px] font-bold font-mono text-black truncate max-w-[150px] inline-block">
                    {orderId || 'MEM-PENDING'}
                  </span>
                </div>
              </div>

              {/* QRIS Visual Box */}
              <div className="border-2 border-black p-6 bg-slate-50 text-center space-y-3">
                <div className="w-48 h-48 bg-white border-2 border-black mx-auto flex flex-col items-center justify-center p-3 shadow-brutalist-sm">
                  <QrCode className="w-36 h-36 text-black" />
                  <span className="text-[8px] font-mono font-black uppercase tracking-wider text-slate-500 mt-1">
                    QRIS Standar Pembayaran
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-600 max-w-xs mx-auto">
                  Pada lingkungan lokal, klik tombol di bawah untuk menyimulasikan pembayaran QRIS berhasil via webhook Pakasir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleSimulatePayment}
                  disabled={paying}
                  className="w-full h-12 bg-accent-lime hover:bg-black hover:text-white text-black border-2 border-black font-black uppercase tracking-wider text-xs shadow-brutalist cursor-pointer transition-all"
                >
                  {paying ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Konfirmasi Pembayaran...
                    </span>
                  ) : (
                    `Simulasikan Bayar Rp ${amountNum.toLocaleString('id-ID')} (QRIS Sukses)`
                  )}
                </Button>

                <Link href="/membership" className="block">
                  <Button
                    variant="secondary"
                    className="w-full h-10 border-2 border-black text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-black shadow-brutalist-sm cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Batalkan &amp; Kembali
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
