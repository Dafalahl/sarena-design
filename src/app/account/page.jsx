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
  const [isOpen, setIsOpen] = useState(true);

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

  if (loading) return <div></div>;

return (
    <div className="flex min-h-screen">
      {/* SideNav sticky */}
      <div className="sticky top-0 h-screen">
        <SideNav active="Account" isOpen={isOpen} isDesigner={isDesigner} />
      </div>

      <div className="flex flex-col flex-1">
        {/* TopBar sticky */}
        <div className="sticky top-0 z-30 bg-white">
          <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
        </div>

            <main className="flex flex-col">

            {/* Banner — hanya designer */}
            {isDesigner && (
                <div className="bg-[#D9D9D9]/70 mx-6 mt-6 rounded-2xl h-40 shadow-md mb-6" />
            )}

            {/* Avatar + Nama — selalu tampil */}
            <div className="flex items-center gap-4 px-8 mt-6 mb-16">
                <img src={user?.avatar_url} className="w-24 h-24 rounded-full shadow-md" />
                <p className="text-2xl font-bold">{user?.full_name}</p>
            </div>

            {/* Portfolio — hanya designer */}
            {isDesigner && (
                <>
                <div className="relative flex items-center px-8 mb-6 mt-4">
                    <hr className="flex-1 border-black/10" />
                    <span className="absolute left-1/2 -translate-x-1/2 bg-white px-4 text-sm font-medium">Portfolio</span>
                    <hr className="flex-1 border-black/10" />
                </div>
                <div className="grid grid-cols-4 gap-4 px-8">
                    {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-[#D9D9D9]/70 rounded-2xl h-52 shadow-xl" />
                    ))}
                </div>
                </>
            )}

            {/* Tombol Become a Designer */}
            {!isDesigner && (
                <div className="flex flex-col gap-2 px-8 mt-8 max-w-sm">
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