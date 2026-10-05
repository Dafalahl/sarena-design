import { createClient } from "@/lib/supabaseServer"
import { notFound } from "next/navigation"
import ProfileHeader from "@/components/ProfileHeader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Calendar, Briefcase, FileText, CheckCircle2, Lock, Sparkles, Award, ArrowLeft } from "lucide-react"
import Link from 'next/link'

export const revalidate = 0

export default async function PublicProfilePage({ params }) {
  const resolvedParams = await params
  const username = resolvedParams?.username
  const supabase = await createClient()

  // 1. Fetch user profile from the unified users table
  const { data: creator, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !creator) {
    notFound()
  }

  // 2. Fetch logged in user
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 3. Fetch succeeded workspace count
  const { count: succeedCount } = await supabase
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creator.id)
    .eq('status', 'released')

  // 4. Fetch followers count (safe query)
  let followersCount = 0
  let followingCount = 0
  let isFollowing = false

  const { count: followersData, error: followersError } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', creator.id)
  
  if (!followersError) {
    followersCount = followersData || 0
  }

  // 5. Fetch following count (safe query)
  const { count: followingData, error: followingError } = await supabase
    .from('follows')
    .select('following_id', { count: 'exact', head: true })
    .eq('follower_id', creator.id)

  if (!followingError) {
    followingCount = followingData || 0
  }

  // 6. Fetch follow status
  if (currentUser) {
    const { data: followRow, error: followRowError } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', currentUser.id)
      .eq('following_id', creator.id)
      .maybeSingle()

    if (!followRowError) {
      isFollowing = !!followRow
    }
  }

  // 7. Fetch completed workspaces for showcase
  const { data: completedWorkspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      client:users!client_id (full_name, avatar_url)
    `)
    .eq('creator_id', creator.id)
    .eq('status', 'released')
    .order('created_at', { ascending: false })

  const projects = completedWorkspaces || []

  // Pre-calculated stats pack
  const initialStats = {
    followers: followersCount,
    following: followingCount,
    isFollowing,
    succeedCount: succeedCount || 0
  }

  return (
    <div className="space-y-6 md:space-y-8 text-black select-none max-w-5xl mx-auto">
      {/* Navigation Breadcrumb / Back button */}
      <div>
        <Link 
          href="/explore" 
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider border-2 border-black bg-white px-3 py-1.5 hover:bg-slate-50 shadow-brutalist-xs hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Explore Desainer
        </Link>
      </div>

      {/* Premium Profile Header (Client Component for follow states) */}
      <ProfileHeader 
        creator={creator} 
        initialStats={initialStats} 
        currentUserId={currentUser?.id} 
      />

      {/* Tabs Showcase Section */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 border-2 border-black p-0 rounded-none mb-8 shadow-brutalist-xs">
          <TabsTrigger 
            value="projects"
            className="flex-1 md:flex-none py-3 px-6 text-xs font-bold uppercase tracking-wider rounded-none data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none border-r border-black last:border-r-0 cursor-pointer"
          >
            Showcase ({projects.length})
          </TabsTrigger>
          <TabsTrigger 
            value="about"
            className="flex-1 md:flex-none py-3 px-6 text-xs font-bold uppercase tracking-wider rounded-none data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none border-r border-black last:border-r-0 cursor-pointer"
          >
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="outline-none">
          {projects.length === 0 ? (
            <div className="text-center py-16 text-black bg-slate-50 rounded-none border-2 border-dashed border-black shadow-inner font-mono text-xs font-bold uppercase tracking-wider">
              Belum ada portofolio publik. Karya akan otomatis muncul setelah workspace escrow diselesaikan dan disetujui.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project, idx) => {
                // Generate a consistent pseudo-random pattern/color for the header of each post card
                const colors = ['bg-accent-lime', 'bg-accent-purple', 'bg-accent-yellow', 'bg-accent-orange', 'bg-accent-blue']
                const accentColor = colors[idx % colors.length]
                return (
                  <div 
                    key={project.id} 
                    className="bg-white border-2 border-black rounded-none overflow-hidden flex flex-col justify-between shadow-brutalist hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist-lg transition-all"
                  >
                    <div>
                      {/* Accent Header */}
                      <div className={`h-20 ${accentColor} border-b-2 border-black flex items-center justify-between px-5 relative`}>
                        <Award className="w-8 h-8 text-black opacity-80" />
                        <span className="font-mono text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 border border-black shadow-brutalist-sm">
                          Rp {project.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      {/* Body */}
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-black text-sm uppercase leading-tight tracking-tight text-black">
                            {project.title || "Collaboration Project"}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-600 font-semibold line-clamp-3 leading-relaxed">
                          {project.brief || "Tidak ada deskripsi rincian proyek."}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 px-5 py-3.5 bg-slate-50 flex items-center justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-lime shrink-0" />
                        <span>Completed Workspace</span>
                      </div>
                      <span suppressHydrationWarning>
                        {new Date(project.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="outline-none">
          <div className="bg-white border-2 border-black p-6 md:p-8 shadow-brutalist space-y-6">
            <div>
              <div className="inline-block border border-black bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-2 shadow-brutalist-xs">
                Creative Synopsis
              </div>
              <p className="text-slate-800 leading-relaxed text-xs sm:text-sm font-semibold whitespace-pre-wrap">
                {creator.bio || "Belum ada ringkasan bio yang ditambahkan oleh kreator."}
              </p>
            </div>

            <Separator className="bg-black h-0.5" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-bold uppercase tracking-wider">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-400">Account Role</span>
                <p className="text-black flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-accent-purple" />
                  {creator.role === 'creator' ? 'Desainer (Creator)' : 'Klien'}
                </p>
              </div>

              {creator.role === 'creator' && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400">Base Project Rate</span>
                  <p className="text-black font-mono">
                    Rp {(creator.price_base || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-400">Bergabung Sejak</span>
                <p className="text-black flex items-center gap-1.5" suppressHydrationWarning>
                  <Calendar className="w-4 h-4 text-accent-orange" />
                  {new Date(creator.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
