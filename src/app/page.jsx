"use client";
import Image from "next/image";
import styles from "./landing.module.css";
import Button from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import LoginModal from "@/components/LoginModal";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <>
      <main className={styles.wrapper}>
        <div className="grow">
          <nav className="flex items-center justify-between px-6 py-4">
            <Image src="/logo.svg" alt="Logo Sarena" width={200} height={67} />
            <div className="flex items-center gap-4">
              <Link href="/find-designer">
                <Button label="Find a designer" />
              </Link>
              <Link href="/inspiration">
                <Button label="Inspiration" />
              </Link>
              {session ? (
                <Button label="Logout" icon={LogOut} onClick={handleLogout} />
              ) : (
                <Button label="Login" icon={LogIn} onClick={() => setShowLogin(true)} />
              )}
            </div>
          </nav>
          <p className="text-[40px] text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] mt-40 text-black">
            Ciptakan Karakter Favoritmu!
          </p>
        </div>

        {/* Footer */}
        <footer className="bg-[#151515] px-10 pt-10 pb-8">
          <div className="flex items-start justify-between mb-8">
            <Image
              src="/logo_putih.svg"
              alt="Logo Sarena putih"
              width={200}
              height={67}
            />

            <div className="flex gap-16">
              <div>
                <p className="text-sm text-white/70 mb-4">Social Media</p>
                <div className="flex items-center">
                  <Button label="Facebook" />
                  <Button label="Instagram" />
                  <Button label="Youtube" />
                </div>
              </div>

              <div>
                <p className="text-sm text-white/70 mb-4">Community</p>
                <div className="flex items-center">
                  <Button label="Discord" />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/20 mb-6" />

          <div>
            <p className="text-white/80 mb-2">© Lima Pilar Inovasi 2026</p>
            <p className="text-sm text-white/50 max-w-md leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </footer>
      </main>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
