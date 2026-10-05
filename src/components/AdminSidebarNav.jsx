'use client'

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, ShieldCheck, LogOut, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AdminSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const links = [
    {
      href: "/admin",
      label: "Summary",
      icon: BarChart3,
      exact: true,
    },
    {
      href: "/admin/users",
      label: "Users Page",
      icon: Users,
    },
    {
      href: "/admin/workspaces",
      label: "Workspace Page",
      icon: Briefcase,
    },
    {
      href: "/admin/escrow",
      label: "Escrow Releases",
      icon: ShieldCheck,
    },
  ];

  const renderNavLink = (link) => {
    const Icon = link.icon;
    const isActive = pathname
      ? (link.exact ? pathname === link.href : pathname.startsWith(link.href))
      : false;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-none border-2 transition-all duration-100 select-none ${
          isActive
            ? "bg-accent-orange text-white border-black shadow-brutalist-sm"
            : "text-black hover:bg-slate-100 border-transparent hover:border-black hover:shadow-brutalist-sm"
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-[16px] h-[16px] shrink-0" />
          <span>{link.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col justify-between h-full text-black select-none relative">
      <div className="flex-1 overflow-y-auto min-h-0 relative pr-1 pt-8">
        <div className="space-y-8 pb-10">
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest px-4 mb-2">Admin Panel</p>
            <div className="flex flex-col gap-1.5">
              {links.map(renderNavLink)}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t-2 border-dashed border-black bg-white flex flex-col gap-2">
        <Link href="/dashboard" className="w-full">
          <Button variant="secondary" className="w-full justify-center gap-2 border-2 border-black bg-white hover:bg-slate-50 text-black shadow-brutalist-xs text-xs font-mono font-bold uppercase tracking-wider h-9">
            Exit Admin
          </Button>
        </Link>
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="w-full justify-center gap-2 text-xs font-mono font-bold uppercase tracking-wider h-9"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
