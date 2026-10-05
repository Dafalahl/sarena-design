import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Sayembara Desain | Sarena',
  description: 'Direktori kontes dan sayembara desain terbuka dengan proteksi hadiah terjamin di Rekber Sarena.'
}

export default function SayembaraPage() {
  return (
    <div className="space-y-6 md:space-y-8 text-black select-none">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            OPEN CONTEST DIRECTORY
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black flex items-center gap-2">
            <Trophy className="w-7 h-7 text-black shrink-0" />
            Sayembara Desain
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">
            Pusat kompetisi dan sayembara desain terbuka dengan hadiah yang terproteksi aman di Rekber Sarena.
          </p>
        </div>
      </header>

      {/* Clean Coming Soon Card */}
      <Card className="bg-white border-2 border-black rounded-none shadow-brutalist overflow-hidden">
        <CardContent className="py-20 px-6 text-center space-y-6 max-w-xl mx-auto">
          <div className="w-20 h-20 border-2 border-black bg-accent-yellow flex items-center justify-center mx-auto shadow-brutalist-sm">
            <Trophy className="w-9 h-9 text-black" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 border border-black bg-black text-accent-lime px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shadow-brutalist-xs">
              <Sparkles className="w-3 h-3" />
              Coming Soon
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              Fitur Sayembara Sedang Dipersiapkan
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Sistem sayembara desain terbuka (*open contest*) sedang dalam tahap pengembangan. Klien nantinya dapat menyelenggarakan kontes desain dengan total hadiah yang terjamin aman di Rekber Sarena.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3 flex-wrap">
            <Link href="/explore">
              <Button className="h-10 px-6 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider bg-accent-lime text-black hover:bg-emerald-400 cursor-pointer">
                Cari &amp; Sewa Desainer 1-on-1
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" className="h-10 px-6 border-2 border-black rounded-none shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider bg-white text-black hover:bg-slate-100 cursor-pointer">
                Ke Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
