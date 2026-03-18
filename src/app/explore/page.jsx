import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/lib/supabaseServer"

// Ensure this page is dynamically rendered since data is fresh
export const revalidate = 0

export default async function ExplorePage() {
  const supabase = await createClient()

  // Fetch verified creators by joining profiles and users tables
  const { data: creators, error } = await supabase
    .from('profiles')
    .select(`
      *,
      users!inner (
        full_name,
        avatar_url
      )
    `)
    // .eq('is_verified', true) // Temporarily commented out so you can see your profile without manual db verification!

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400 mb-4">
          Discover Top Talent
        </h1>
        <p className="text-lg text-slate-400">
          Browse incredible portfolios and hire verified creators with Sarena's secure Escrow protection.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-12 justify-center">
        <Badge variant="secondary" className="px-6 py-2 rounded-full text-sm font-medium bg-indigo-500/20 text-white border-indigo-500/30 cursor-pointer hover:bg-indigo-500/30 transition">All Creators</Badge>
        <Badge variant="outline" className="px-6 py-2 rounded-full text-sm font-medium text-slate-400 border-white/10 cursor-pointer hover:bg-white/5 transition">Illustration</Badge>
        <Badge variant="outline" className="px-6 py-2 rounded-full text-sm font-medium text-slate-400 border-white/10 cursor-pointer hover:bg-white/5 transition">Web Design</Badge>
        <Badge variant="outline" className="px-6 py-2 rounded-full text-sm font-medium text-slate-400 border-white/10 cursor-pointer hover:bg-white/5 transition">Branding</Badge>
      </div>

      {error && (
        <div className="text-center text-rose-400 p-8">
          Failed to load creators: {error.message}
        </div>
      )}

      {(!creators || creators.length === 0) && !error && (
         <div className="text-center text-slate-400 py-16">
            No creators found. Be the first to join!
         </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {creators?.map((creator) => {
          // If the portfolio URL is not an image, we can just use a nice gradient fallback or the avatar
          const isImageLink = creator.portfolio_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)
          return (
            <Link href={`/creator/${creator.username}`} key={creator.id} className="group">
              <Card className="glass rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)] border-white/5 group-hover:border-indigo-500/30 bg-slate-900/40 backdrop-blur-xl h-full flex flex-col">
                <div className="h-48 overflow-hidden relative bg-gradient-to-br from-indigo-500/20 to-rose-500/20 flex items-center justify-center">
                  <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-transparent transition-colors z-10" />
                  {isImageLink ? (
                     <img 
                      src={creator.portfolio_url} 
                      alt={`${creator.users.full_name} Portfolio`}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <span className="text-white/50 text-xs tracking-widest uppercase relative z-0">
                      View External Portfolio
                    </span>
                  )}
                </div>
                <CardContent className="p-6 relative flex-1 flex flex-col">
                  <img 
                    src={creator.users?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.username}`} 
                    alt={creator.users?.full_name}
                    className="w-16 h-16 rounded-full border-4 border-[#0f172a] absolute -top-10 left-6 object-cover bg-slate-900"
                  />
                  <div className="mt-6 flex justify-between items-start flex-1">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{creator.users?.full_name || creator.username}</h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{creator.bio}</p>
                    </div>
                  </div>
                  <div className="text-right mt-4 pt-4 border-t border-white/10">
                    <span className="text-xs text-slate-500 block">From</span>
                    <span className="font-semibold text-rose-400">Rp {(creator.price_base || 0).toLocaleString('id-ID')}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
