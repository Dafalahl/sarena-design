"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        console.log("authUser:", authUser);
        console.log("authError:", authError);
        if (!authUser) {
            setLoading(false); // ← tambah ini
            return;
        }


    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    console.log("data:", data);
    console.log("error:", error);
    

      setUser(data);
      setRole(data?.role);
      setLoading(false);

      if (data?.role === "designer") {
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

  const handleSelectRole = async (selectedRole) => {
    await supabase
      .from("users")
      .update({ role: selectedRole })
      .eq("id", user.id);

    if (selectedRole === "designer") {
      await supabase
        .from("profiles")
        .insert({ id: user.id, username: user.full_name });
    }

    setRole(selectedRole);
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

    {(role === "client" || !role) && (
    <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Profil Kamu</h2>
        <img src={user?.avatar_url} className="w-20 h-20 rounded-full" />
        <p className="text-gray-500 text-sm">Nama</p>
        <p className="font-medium">{user?.full_name}</p>
        <p className="text-gray-500 text-sm">Email</p>
        <p className="font-medium">{user?.email}</p>

        {/* Tombol upgrade */}
        <hr className="border-black/10" />
        <p className="text-sm text-gray-500">Ingin menjadi designer?</p>
        <button
        onClick={() => handleSelectRole("designer")}
        className="py-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
        >
        Become a Designer
        </button>
    </div>
    )}

          {/* Profil Designer — bisa edit */}
          {role === "designer" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Profil Designer</h2>
              <img src={user.avatar_url} className="w-20 h-20 rounded-full" />
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border border-black/20 rounded-lg px-3 py-2 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="border border-black/20 rounded-lg px-3 py-2 outline-none resize-none h-28"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                className="py-3 bg-black text-white rounded-lg hover:bg-black/80 transition-colors"
              >
                Simpan
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}