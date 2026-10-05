import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { createClient } from "@/lib/supabaseServer"
import UserAvatar from "@/components/UserAvatar"
import { Compass } from "lucide-react"

// Ensure this page is dynamically rendered since data is fresh
export const revalidate = 0

export default async function ExplorePage({ searchParams }) {
  const supabase = await createClient()
  const params = await searchParams
  const activeCategory = params?.category || 'All'

  // Fetch verified creators directly from the unified users table
  const { data: creators, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'creator')

  // Filter creators dynamically by matching search tags in username, name, or bio
  let filteredCreators = creators || []
  if (activeCategory !== 'All') {
    const categoryLower = activeCategory.toLowerCase()
    filteredCreators = filteredCreators.filter(creator => {
      const bio = (creator.bio || '').toLowerCase()
      const username = (creator.username || '').toLowerCase()
      const name = (creator.full_name || '').toLowerCase()
      
      if (categoryLower === 'illustration') {
        return bio.includes('illustr') || bio.includes('sketch') || bio.includes('drawing') || bio.includes('poster') || bio.includes('art') || bio.includes('paint') || username.includes('illustr') || name.includes('illustr')
      } else if (categoryLower === 'web design') {
        return bio.includes('web') || bio.includes('design') || bio.includes('ui') || bio.includes('ux') || bio.includes('website') || bio.includes('figma') || bio.includes('desainer') || bio.includes('layout') || username.includes('web') || name.includes('web')
      } else if (categoryLower === 'branding') {
        return bio.includes('brand') || bio.includes('logo') || bio.includes('identity') || bio.includes('packaging') || username.includes('brand') || name.includes('brand')
      }
      return true
    })
  }

  return (
    <div className="space-y-6 md:space-y-8 text-black select-none">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b-2 border-black">
        <div>
          <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 shadow-brutalist-sm">
            CREATOR DIRECTORY
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black">
            Explore Desainer
          </h1>
          <p className="text-slate-600 text-xs font-semibold mt-1">
            Temukan talenta desainer terverifikasi dan mulai kolaborasi pesanan aman dengan proteksi Rekber Sarena.
          </p>
        </div>

        {/* Interactive Category Selector Tags */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All Creators", href: "/explore", active: activeCategory === 'All' },
            { label: "Illustration", href: "/explore?category=Illustration", active: activeCategory === 'Illustration' },
            { label: "Web Design", href: "/explore?category=Web%20Design", active: activeCategory === 'Web%20Design' || activeCategory === 'Web Design' },
            { label: "Branding", href: "/explore?category=Branding", active: activeCategory === 'Branding' }
          ].map((tag, idx) => (
            <Link href={tag.href} key={idx}>
              <span className={`inline-block px-3 py-1.5 rounded-none text-xs font-bold font-mono uppercase tracking-wider border-2 border-black cursor-pointer transition-all shadow-brutalist-sm ${
                tag.active
                  ? 'bg-accent-lime text-black'
                  : 'text-black bg-white hover:bg-slate-50'
              }`}>
                {tag.label}
              </span>
            </Link>
          ))}
        </div>
      </header>

      {error && (
        <div className="text-center text-rose-600 border-2 border-black bg-rose-50 p-8 font-bold font-mono text-xs shadow-brutalist-sm max-w-md mx-auto">
          Gagal memuat kreator: {error.message}
        </div>
      )}

      {(!filteredCreators || filteredCreators.length === 0) && !error && (
         <div className="text-center py-20 bg-white border-2 border-black shadow-brutalist max-w-md mx-auto font-bold font-mono text-xs uppercase tracking-wider">
            Tidak ditemukan desainer pada kategori &quot;{activeCategory}&quot;.
         </div>
      )}

      {filteredCreators && filteredCreators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCreators.map((creator) => {
            const isImageLink = creator.portfolio_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)
            const targetHref = creator.username ? `/${creator.username}` : '#'
            return (
              <Link href={targetHref} key={creator.id} className="group">
                <div className="bg-white border-2 border-black rounded-none overflow-hidden transition-all duration-150 ease-out shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm h-full flex flex-col">
                  {/* Portfolio cover section */}
                  <div className="h-44 overflow-hidden relative bg-[#FAF9F6] border-b-2 border-black flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors z-10" />
                    {isImageLink ? (
                       <img 
                        src={creator.portfolio_url} 
                        alt={`${creator.full_name} Portfolio`}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    ) : (
                      <span className="text-black font-bold font-mono text-[10px] tracking-widest uppercase relative z-0 border border-black bg-white px-3 py-1 shadow-brutalist-sm">
                        View Portfolio
                      </span>
                    )}
                  </div>
                  {/* Content section */}
                  <div className="p-5 relative flex-1 flex flex-col justify-between">
                    <div className="relative">
                      <UserAvatar
                        src={creator.avatar_url}
                        name={creator.full_name || creator.username}
                        email={creator.email}
                        className="w-12 h-12 rounded-none border-2 border-black shadow-brutalist-sm absolute -top-11 left-0 shrink-0"
                      />
                      <div className="mt-4">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black uppercase tracking-tight text-black group-hover:text-accent-purple transition-colors truncate">
                            {creator.full_name || creator.username}
                          </h3>
                          {creator.is_member && (
                            <span className="bg-accent-yellow text-black border border-black font-mono font-black text-[8px] px-1 py-0.5 uppercase shadow-brutalist-xs shrink-0" title="Verified Creator Pro">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-xs font-medium leading-relaxed mt-1.5 line-clamp-2">
                          {creator.bio || "Desainer grafis & kreator profesional."}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-5 pt-3 border-t-2 border-black font-mono">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Rate Base</span>
                      <span className="text-xs font-bold bg-accent-lime text-black border border-black px-2 py-0.5 shadow-brutalist-sm">
                        Rp {(creator.price_base || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
