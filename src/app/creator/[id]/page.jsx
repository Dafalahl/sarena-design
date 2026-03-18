import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabaseServer"
import { notFound } from "next/navigation"

export const revalidate = 0

export default async function CreatorProfilePage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch creator profile by username
  const { data: creator, error } = await supabase
    .from('profiles')
    .select(`
      *,
      users!inner (
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('username', id)
    .single()

  if (error || !creator) {
    notFound()
  }

  const isImageLink = creator.portfolio_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="glass rounded-3xl overflow-hidden mb-12 relative border-white/5 bg-slate-900/40 backdrop-blur-xl">
         <div className="h-64 md:h-80 bg-gradient-to-br from-indigo-500/20 to-rose-500/20 relative overflow-hidden flex items-center justify-center">
            {isImageLink && (
              <img 
                src={creator.portfolio_url} 
                className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                alt="Cover Image"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />
         </div>

         <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between -mt-20 gap-6">
               <div className="flex items-end space-x-6">
                 <img 
                    src={creator.users?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.username}`}
                    className="w-32 h-32 rounded-3xl border-4 border-[#0f172a] shadow-xl object-cover relative z-10 bg-slate-900" 
                    alt="Creator Avatar" 
                 />
                 <div className="mb-2">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                      {creator.users?.full_name}
                      {creator.is_verified && (
                        <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </h1>
                    <p className="text-indigo-400 font-medium font-mono text-sm leading-none mt-1">@{creator.username}</p>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-2">
                 <a href={creator.portfolio_url || '#'} target="_blank" rel="noopener noreferrer">
                   <Button variant="secondary" className="px-8 py-3 text-base shadow-lg w-full sm:w-auto h-12 rounded-xl">
                     View External Portfolio
                   </Button>
                 </a>
                 <Link href={`/order/${id}`}>
                   <Button variant="gradient" className="px-8 py-3 text-base shadow-[0_0_20px_rgba(244,63,94,0.4)] w-full sm:w-auto h-12 rounded-xl">
                     Hire via Escrow (Rp {(creator.price_base || 0).toLocaleString('id-ID')})
                   </Button>
                 </Link>
               </div>
            </div>

            <Separator className="my-10 bg-white/5" />

            <Tabs defaultValue="about" className="w-full">
              <TabsList className="bg-slate-900/50 border border-white/10 p-1 rounded-full mb-8">
                <TabsTrigger value="about" className="rounded-full px-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">About</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-full px-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="about">
                <div className="max-w-3xl">
                  <h3 className="text-xl font-bold text-white mb-4">Creative Synopsis</h3>
                  <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">{creator.bio}</p>
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="text-center py-12 text-slate-400 glass rounded-2xl border border-dashed border-white/10">
                  <p>No reviews yet. Be the first to hire {creator.users?.full_name}!</p>
                </div>
              </TabsContent>
            </Tabs>
         </div>
      </Card>
    </div>
  )
}
