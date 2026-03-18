import Link from "next/link";
import { User, Image as ImageIcon, MessageSquare, Settings } from "lucide-react";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass border-r border-white/5 relative z-10 hidden md:block">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-rose-500">
            Sarena
          </Link>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User className="w-5 h-5" />
            <span>Overview</span>
          </Link>
          <Link href="/dashboard/profile-setup" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
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
