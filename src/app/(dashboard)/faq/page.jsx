'use client'

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { 
  FileQuestion, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Shield,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react'

export default function FAQPage() {
  const [expandedIndex, setExpandedIndex] = useState(0)

  const toggleFAQ = (index) => {
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else {
      setExpandedIndex(index)
    }
  }

  const faqs = [
    {
      question: "Bagaimana sistem Escrow (Rekber) Sarena bekerja?",
      answer: "Ketika klien memesan proyek, pembayaran disetorkan terlebih dahulu ke rekening escrow Sarena. Dana ini tersimpan aman di brankas rekber sampai desainer menyelesaikan pekerjaan dan menyerahkan file master. Setelah klien mereview dan menyetujui (Handshake), dana otomatis dicairkan ke saldo desainer.",
      icon: Shield
    },
    {
      question: "Format file apa saja yang diterima di Workspace?",
      answer: "Untuk menjaga performa dan keamanan preview langsung di browser, file manager Workspace menerima format PDF (.pdf) dan WebP (.webp). Jika Anda perlu mengirimkan source file mentah berukuran besar (seperti Figma link, file .ai, atau .psd), disarankan mencantumkan tautan cloud drive terproteksi di dalam catatan workspace atau mengompresi preview layout-nya terlebih dahulu.",
      icon: Sparkles
    },
    {
      question: "Berapa kapasitas penyimpanan untuk tiap Workspace?",
      answer: "Setiap workspace memiliki kuota penyimpanan terdedikasi sebesar 10 MB. Anda dapat mengunggah berbagai dokumen dan aset gambar, dan penggunaan kapasitas dapat dipantau secara langsung melalui bar status penyimpanan di File Explorer.",
      icon: Layers
    },
    {
      question: "Bagaimana cara kerja kuota revisi?",
      answer: "Setiap kesepakatan workspace menetapkan batas kuota revisi (misalnya 3 kali revisi). Jika hasil kerja memerlukan perbaikan, klien dapat mengklik 'Minta Revisi' yang akan mengurangi 1 siklus revisi dan memberi notifikasi kepada desainer untuk memperbarui pekerjaan.",
      icon: Clock
    },
    {
      question: "Apakah klien bisa mengajukan pengembalian dana (refund)?",
      answer: "Bisa. Jika desainer tidak merespons dalam batas waktu atau kedua belah pihak sepakat membatalkan proyek, dana yang berada di escrow dapat dikembalikan (refund) ke klien. Untuk kendala yang membutuhkan mediasi, Anda dapat membuka tiket bantuan melalui halaman Help & Support.",
      icon: HelpCircle
    }
  ]

  return (
    <div className="space-y-6 md:space-y-8 text-black select-none">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            KNOWLEDGE BASE
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black flex items-center gap-2">
            <FileQuestion className="w-7 h-7 text-black shrink-0" />
            Frequently Asked Questions
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">
            Jawaban lengkap seputar alur transaksi Rekber, upload file workspace, revisi milestone, dan pencairan dana Sarena.
          </p>
        </div>
      </header>

      {/* Accordion FAQ List */}
      <div className="space-y-4 max-w-4xl">
        {faqs.map((faq, idx) => {
          const isExpanded = expandedIndex === idx
          const Icon = faq.icon
          const colors = [
            "bg-accent-lime text-black",
            "bg-accent-purple text-white",
            "bg-accent-yellow text-black",
            "bg-accent-blue text-black",
            "bg-accent-orange text-black",
          ]
          const colorClass = colors[idx % colors.length]

          return (
            <Card 
              key={idx} 
              className={`bg-white border-2 border-black rounded-none transition-all duration-200 overflow-hidden ${
                isExpanded ? 'shadow-brutalist' : 'shadow-brutalist-sm hover:shadow-brutalist hover:-translate-x-[1px] hover:-translate-y-[1px]'
              }`}
            >
              <div 
                onClick={() => toggleFAQ(idx)}
                className={`p-4 sm:p-5 flex justify-between items-center cursor-pointer select-none transition-colors ${
                  isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className={`w-9 h-9 rounded-none border-2 border-black flex items-center justify-center shrink-0 shadow-brutalist-xs ${colorClass}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase text-black tracking-wide leading-snug">
                    {faq.question}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-none border-2 border-black bg-white flex items-center justify-center shrink-0 shadow-brutalist-xs">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-black" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-black" />
                  )}
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-5 py-4 border-t-2 border-black bg-white">
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed font-sans">{faq.answer}</p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
