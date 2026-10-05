'use client'

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, UserPlus, Menu, X, LogOut, LayoutDashboard, User, MessageSquare, Settings, Mail, Briefcase, Users, ShieldCheck, BarChart3, CreditCard, Headphones, FileQuestion, Compass, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import UserAvatar from './UserAvatar';
import { Button } from '@/components/ui/button';

function NavbarContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role, full_name, avatar_url, username')
          .eq('id', user.id)
          .maybeSingle();
        if (data) {
          setRole(data.role || 'client');
          setProfileData(data);
        }
      } else {
        setProfileData(null);
      }
    }
    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('client');
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-20 z-50 flex items-center justify-between px-5 sm:px-6 lg:px-8 bg-white border-b-[3px] border-black text-black">
        {/* Brand logo - Left */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-black tracking-tighter cursor-pointer text-black hover:opacity-95 transition-opacity">
            SARENA<span className="text-[9px] font-black text-accent-purple align-super ml-0.5 font-mono">TM</span>
          </Link>
        </div>

        {/* User Auth & Actions - Right */}
        <div className="flex items-center gap-3 sm:gap-6 text-black relative">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3 hidden sm:flex">
                {/* Show Dashboard button when on landing page or membership page */}
                {(pathname === '/' || pathname?.startsWith('/membership')) && (
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold font-mono uppercase tracking-wider bg-accent-lime text-black py-2 px-3 border-2 border-black hover:bg-black hover:text-white transition-all shadow-brutalist-sm cursor-pointer select-none"
                  >
                    Dashboard
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-black bg-white hover:bg-slate-50 transition-all shadow-brutalist-sm cursor-pointer select-none"
                  >
                    <UserAvatar
                      src={profileData?.avatar_url}
                      name={profileData?.username || profileData?.full_name}
                      email={user.email}
                      className="w-6 h-6 rounded-none border border-black"
                    />
                    <span className="text-xs font-bold font-mono lowercase max-w-[120px] truncate">
                      @{profileData?.username || user.email?.split('@')[0]}
                    </span>
                    <svg
                      className={`w-4 h-4 text-black transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Clean Dropdown Menu - No redundant links already present in sidebar */}
                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30 cursor-default" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-3 w-56 bg-white border-[3px] border-black rounded-none shadow-brutalist z-40 divide-y-2 divide-black">
                        <div className="px-4 py-3 bg-slate-50">
                          {profileData?.full_name && (
                            <span className="text-black font-extrabold text-xs block normal-case font-sans leading-tight">
                              {profileData.full_name}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                            <span className="text-accent-purple font-bold text-[11px] font-mono truncate">
                              @{profileData?.username || user.email?.split('@')[0]}
                            </span>
                            <span className="text-[9px] font-black font-mono uppercase px-1.5 py-0.5 bg-black text-white">
                              {role === 'creator' || role === 'designer' ? 'Desainer' : 'Klien'}
                            </span>
                          </div>
                          <span className="text-slate-500 font-medium text-[10px] lowercase font-sans block truncate">{user.email}</span>
                        </div>

                        {profileData?.username && (role === 'creator' || role === 'designer') && (
                          <div className="flex flex-col">
                            <Link
                              href={`/${profileData.username}`}
                              onClick={() => setDropdownOpen(false)}
                              className="group flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-accent-lime transition-colors"
                            >
                              <User className="w-4 h-4 text-black" />
                              Lihat Profil Publik
                            </Link>
                          </div>
                        )}

                        <div>
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              handleSignOut();
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-accent-orange hover:bg-accent-orange hover:text-white transition-colors text-left cursor-pointer font-bold uppercase tracking-wider"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/explore" className="text-xs font-bold font-mono uppercase tracking-wider hover:text-accent-purple transition-colors cursor-pointer py-2 px-3">
                  Jelajahi Desainer
                </Link>
                <Link href="/login" className="text-xs font-bold font-mono uppercase tracking-wider hover:text-accent-purple transition-colors cursor-pointer py-2 px-3">
                  Log In
                </Link>
                <Link href="/login">
                  <Button size="sm" variant="default">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )
          )}

          {/* Mobile drawer button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-none border-2 border-black bg-white text-black transition-colors hover:bg-accent-lime cursor-pointer shadow-brutalist-sm"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Menu
              className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
            />
            <X
              className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Mobile menu drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-white border-l-4 border-black shadow-brutalist transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-y-auto px-8 py-8">
          <div className="flex flex-col gap-6 my-auto w-full">
            {user && (
              <div className={`flex items-center gap-3 pb-6 border-b-2 border-black transition-all duration-300 ${menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`} style={{ transitionDelay: '100ms' }}>
                <UserAvatar
                  src={profileData?.avatar_url}
                  name={profileData?.username || profileData?.full_name}
                  email={user.email}
                  className="w-10 h-10 rounded-none border-2 border-black shadow-brutalist-sm"
                />
                <div className="flex flex-col min-w-0">
                  {profileData?.full_name && (
                    <span className="text-sm font-extrabold text-black truncate leading-tight">
                      {profileData.full_name}
                    </span>
                  )}
                  <span className="text-xs font-bold text-accent-purple font-mono truncate leading-tight font-mono lowercase">
                    @{profileData?.username || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 lowercase font-mono truncate leading-normal mt-0.5">
                    {user.email}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {pathname && pathname.startsWith('/admin') ? (
                <div className="flex flex-col gap-3">
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="w-full">
                    <Button variant="secondary" className="w-full justify-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Summary
                    </Button>
                  </Link>
                  <Link href="/admin/users" onClick={() => setMenuOpen(false)} className="w-full">
                    <Button variant="secondary" className="w-full justify-center gap-2">
                      <Users className="w-4 h-4" />
                      Users Page
                    </Button>
                  </Link>
                  <Link href="/admin/workspaces" onClick={() => setMenuOpen(false)} className="w-full">
                    <Button variant="secondary" className="w-full justify-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Workspace Page
                    </Button>
                  </Link>
                  <Link href="/admin/escrow" onClick={() => setMenuOpen(false)} className="w-full">
                    <Button variant="secondary" className="w-full justify-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Escrow Releases
                    </Button>
                  </Link>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                    <Button variant="secondary" className="w-full justify-center gap-2 border-2 border-black bg-white hover:bg-slate-50 text-black shadow-brutalist-sm">
                      Exit Admin
                    </Button>
                  </Link>
                  <Button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    variant="destructive"
                    className="w-full justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                user ? (
                  <div className="flex flex-col gap-2">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/explore" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <Compass className="w-4 h-4" />
                        Explore Desainer
                      </Button>
                    </Link>
                    <Link href="/workspace" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <Briefcase className="w-4 h-4" />
                        Workspaces
                      </Button>
                    </Link>
                    <Link href="/inbox" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <Mail className="w-4 h-4" />
                        Inbox
                      </Button>
                    </Link>
                    <Link href="/transactions" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <CreditCard className="w-4 h-4" />
                        Transaction
                      </Button>
                    </Link>
                    <Link href="/account" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <User className="w-4 h-4" />
                        Account & Profile
                      </Button>
                    </Link>
                    <Link href="/help" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <Headphones className="w-4 h-4" />
                        Help & Support
                      </Button>
                    </Link>
                    <Link href="/faq" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-start gap-3">
                        <FileQuestion className="w-4 h-4" />
                        FAQ
                      </Button>
                    </Link>
                    <Button
                      onClick={() => { setMenuOpen(false); handleSignOut(); }}
                      variant="destructive"
                      className="w-full justify-center gap-2 mt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/explore" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-center gap-2">
                        <Compass className="w-4 h-4" />
                        Jelajahi Desainer
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <Button variant="secondary" className="w-full justify-center">
                        Log In
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <Button variant="default" className="w-full justify-center">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<div className="h-20" />}>
      <NavbarContent />
    </Suspense>
  );
}
