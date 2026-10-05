'use client'

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LayoutDashboard, Image as ImageIcon, MessageSquare, Settings, Compass, ShieldAlert, Headphones, FileQuestion, Mail, Briefcase, CreditCard, X, Sparkles, Check, ExternalLink, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SidebarNav({ role }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProModal, setShowProModal] = useState(false);
  const [isProMember, setIsProMember] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showProModal) {
        setShowProModal(false);
      }
    };
    if (showProModal) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProModal]);

  useEffect(() => {
    let active = true;

    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;

        // Fetch is_member status
        const { data: memberData } = await supabase
          .from('users')
          .select('is_member')
          .eq('id', user.id)
          .maybeSingle();

        if (memberData && active) {
          setIsProMember(memberData.is_member || false);
        }

        // Fetch pending invitations requiring user's response (handshake === false)
        const { data: invites, error } = await supabase
          .from('workspaces')
          .select('id, client_id, creator_id, handshake')
          .eq('status', 'pending')
          .eq('handshake', false)
          .neq('created_by', user.id)
          .or(`client_id.eq.${user.id},creator_id.eq.${user.id}`);

        if (error) {
          console.error("Error fetching sidebar invites count:", error.message);
        }

        const validInvites = (invites || []).filter(
          ws => ws.client_id !== null && ws.creator_id !== null && !ws.handshake
        );

        // Fetch unread inquiry messages
        let unreadMsgCount = 0;
        try {
          const { count, error: chatErr } = await supabase
            .from('workspace_chats')
            .select('*', { count: 'exact', head: true })
            .is('workspace_id', null)
            .eq('recipient_id', user.id)
            .eq('is_read', false);

          if (!chatErr && typeof count === 'number') {
            unreadMsgCount = count;
          }
        } catch (chatError) {
          console.warn("Failed to fetch unread chat count:", chatError);
        }

        if (active) {
          setUnreadCount(validInvites.length + unreadMsgCount);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    }

    fetchUserData();

    // Re-check on window focus or custom inbox events
    const handleUpdate = () => {
      fetchUserData();
    };
    window.addEventListener('inbox-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    // Subscribe to realtime updates on workspaces and workspace_chats tables
    const invitesChannel = supabase
      .channel('sidebar-invites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces'
        },
        () => {
          fetchUserData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_chats'
        },
        () => {
          fetchUserData();
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener('inbox-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      supabase.removeChannel(invitesChannel);
    };
  }, [pathname]);

  const handleUpgradePro = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Gagal membuat sesi pembayaran.");
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error(err);
      alert("Gagal melanjutkan ke pembayaran: " + err.message);
      setUpgrading(false);
    }
  };

  const menuLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/workspace",
      label: "Workspaces",
      icon: Briefcase,
    },
    {
      href: "/inbox",
      label: "Inbox",
      icon: Mail,
    },
    {
      href: "/transactions",
      label: "Transactions",
      icon: CreditCard,
    },
  ];

  const generalLinks = [
    {
      href: "/explore",
      label: "Explore Desainer",
      icon: Compass,
    },
    {
      href: "/sayembara",
      label: "Sayembara Desain",
      icon: Trophy,
    },
    {
      href: "/account",
      label: "Account & Profile",
      icon: User,
    },
    {
      href: "/help",
      label: "Help & Support",
      icon: Headphones,
    },
    {
      href: "/faq",
      label: "FAQ",
      icon: FileQuestion,
    }
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
            ? "bg-accent-lime text-black border-black shadow-brutalist-sm"
            : "text-black hover:bg-slate-100 border-transparent hover:border-black hover:shadow-brutalist-sm"
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-[16px] h-[16px] shrink-0" />
          <span>{link.label}</span>
        </div>
        {link.label === "Inbox" && unreadCount > 0 && (
          <span className="bg-accent-orange text-black font-mono font-black text-[9px] px-1.5 py-0.5 border border-black shadow-brutalist-sm transition-all duration-100 leading-none">
            {unreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-col justify-between h-full text-black select-none relative">
      {/* Scrollable links container */}
      <div className="flex-1 overflow-y-auto min-h-0 relative pr-1 pt-8">
        <div className="space-y-8 pb-10">
          {/* Menu Section */}
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest px-4 mb-2">Menu</p>
            <div className="flex flex-col gap-1.5">
              {menuLinks.map(renderNavLink)}
            </div>
          </div>

          {/* General Section */}
          <div className="px-4 space-y-2">
            <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest px-4 mb-2">General</p>
            <div className="flex flex-col gap-1.5">
              {generalLinks.map(renderNavLink)}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom area (Upsell card + Admin section) */}
      <div className="flex flex-col shrink-0 bg-white pt-0 z-20 relative">
        {/* Membership Promo Card - Always PRO ACCESS */}
        <div className="px-4 mb-4">
          <div className="bg-accent-yellow border-2 border-black p-4 rounded-none shadow-brutalist-sm text-black flex flex-col gap-3 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black font-mono bg-black text-white px-2 py-0.5 uppercase tracking-wider shadow-brutalist-sm">
                PRO ACCESS
              </span>
              <span className="text-[9px] font-bold font-mono text-black uppercase">
                {isProMember ? "Active Pro" : "Slot 6 Proyek"}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight">Level Up Your Work</h4>
              <p className="text-[10px] text-slate-800 mt-1 font-semibold leading-normal">
                Buka kuota hingga 6 proyek aktif, verified creator badge, dan prioritas sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProModal(true)}
              className="w-full text-center text-xs font-bold uppercase tracking-wider py-2 bg-white text-black border-2 border-black shadow-brutalist-sm hover:bg-slate-50 transition-all select-none hover:-translate-x-[1px] hover:-translate-y-[1px] cursor-pointer"
            >
              {isProMember ? "Kelola Pro" : "Go Premium"}
            </button>
          </div>
        </div>

      </div>

      {/* PRO ACCESS Modal Dialog - Rendered via createPortal directly into document.body */}
      {showProModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none cursor-pointer"
          onClick={() => setShowProModal(false)}
        >
          <div
            className="bg-white border-[3px] border-black p-6 sm:p-7 max-w-md w-full shadow-[8px_8px_0px_0px_#000000] relative text-black select-text cursor-default animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowProModal(false)}
              className="absolute top-4 right-4 w-8 h-8 border-2 border-black bg-white hover:bg-rose-500 hover:text-white flex items-center justify-center font-bold transition-colors cursor-pointer shadow-brutalist-sm"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 bg-accent-yellow border-2 border-black px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider mb-3 shadow-brutalist-sm">
              <Sparkles className="w-3.5 h-3.5" />
              SARENA CREATOR PRO
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
              Tingkatkan Kapasitas Kerja
            </h3>
            <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
              Solusi terbaik untuk kreator yang ingin menangani banyak klien sekaligus dengan proteksi rekber terpercaya.
            </p>

            {/* Benefit Points */}
            <div className="my-5 p-4 border-2 border-black bg-slate-50 space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs font-bold text-black">
                <div className="w-5 h-5 bg-accent-lime border border-black flex items-center justify-center shrink-0 mt-0.5 shadow-brutalist-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Kapasitas hingga <strong className="underline">6 Proyek Aktif</strong> sekaligus (Free: batas 2 proyek)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs font-bold text-black">
                <div className="w-5 h-5 bg-accent-lime border border-black flex items-center justify-center shrink-0 mt-0.5 shadow-brutalist-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Badge centang <strong className="underline">Verified Creator</strong> di profil & explore</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs font-bold text-black">
                <div className="w-5 h-5 bg-accent-lime border border-black flex items-center justify-center shrink-0 mt-0.5 shadow-brutalist-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Prioritas antrian pencairan dana Rekber & support 24/7</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs font-bold text-black">
                <div className="w-5 h-5 bg-accent-lime border border-black flex items-center justify-center shrink-0 mt-0.5 shadow-brutalist-sm">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Bebas batas order untuk setiap klien yang memilih Anda</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline justify-between p-3 border-2 border-black bg-accent-lime/20 mb-5 font-mono">
              <span className="text-xs font-bold uppercase">Biaya Langganan</span>
              <div className="text-right">
                <span className="text-lg font-black text-black">Rp 99.000</span>
                <span className="text-[10px] text-slate-600 font-bold"> / bulan</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              {isProMember ? (
                <div className="w-full text-center py-3 bg-accent-lime text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-brutalist-sm">
                  Status Anda Saat Ini: Creator Pro Aktif
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUpgradePro}
                  disabled={upgrading}
                  className="w-full py-3 bg-accent-yellow hover:bg-black hover:text-white text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-brutalist transition-all cursor-pointer active:translate-x-0 active:translate-y-0"
                >
                  {upgrading ? "Menyiapkan Pembayaran..." : "Lanjut ke Pembayaran (Rp 99.000)"}
                </button>
              )}

              <Link
                href="/membership"
                onClick={() => setShowProModal(false)}
                className="w-full text-center py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black font-bold text-xs uppercase tracking-wider shadow-brutalist-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>Lihat Rincian Halaman Lengkap</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
