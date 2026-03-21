"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [isDesigner, setIsDesigner] = useState(false);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser(data);
      setIsDesigner(data?.is_designer || false);
      setLoading(false);

      if (data?.is_designer) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setBio(profile?.bio || "");
        setUsername(profile?.username || "");
      }
    };

    fetchUser();
  }, []);

  const handleBecomeDesigner = async () => {
    await supabase
      .from("users")
      .update({ is_designer: true })
      .eq("id", user.id);

    await supabase
      .from("profiles")
      .insert({ id: user.id, username: user.full_name });

    setIsDesigner(true);
  };

  const handleSaveProfile = async () => {
    await supabase
      .from("profiles")
      .update({ username, bio })
      .eq("id", user.id);
    alert("Profil tersimpan!");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen">
      <SideNav active="Account" isOpen={isNavOpen} />
      <div className="flex flex-col flex-1">
        <TopBar onToggleNav={() => setIsNavOpen(!isNavOpen)} />
        <main className="p-8 max-w-lg">

          {/* Profil Client — selalu tampil */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Profil Kamu</h2>
            <img src={user?.avatar_url} className="w-20 h-20 rounded-full" />
            <p className="text-gray-500 text-sm">Nama</p>
            <p className="font-medium">{user?.full_name}</p>
          </div>

          {/* Tombol Become a Designer — hanya kalau belum jadi designer */}
          {!isDesigner && (
            <div className="flex flex-col gap-2 mt-6">
              <hr className="border-black/10" />
              <p className="text-sm text-gray-500">Ingin menjadi designer?</p>
              <button
                onClick={handleBecomeDesigner}
                className="py-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
              >
                Become a Designer
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}