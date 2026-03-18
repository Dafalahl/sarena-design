import Link from "next/link";
import { User, Image as ImageIcon, MessageSquare, Settings, Compass, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabaseServer";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let role = 'user';
  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData) role = userData.role;
  }
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass border-r border-white/5 relative z-10 hidden md:block">
        {/* <div className="p-6">
          <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-rose-500">
            Sarena
          </Link>
        </div> */}
        <nav className="mt-6 px-4 space-y-2">
          <Link href="/explore" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors mt-6 border border-transparent hover:border-white/10">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span className="text-white">Explore Marketplace</span>
          </Link>
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="w-5 h-5" />
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/profile" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <ImageIcon className="w-5 h-5" />
            <span>Creator Profile</span>
          </Link>
          <Link href="/dashboard/messages" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>

          {role === 'admin' && (
            <div className="pt-6 mt-6 border-t border-white/5">
              <Link href="/admin/escrow" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/20">
                <ShieldAlert className="w-5 h-5" />
                <span>Admin Escrow Panel</span>
              </Link>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="p-8 max-w-6xl mx-auto w-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
