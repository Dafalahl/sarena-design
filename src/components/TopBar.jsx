"use client";

import { Search, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";

export default function TopBar({ onToggleNav }) {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from("users")
        .select("avatar_url, full_name")
        .eq("id", authUser.id)
        .single();

      setUser(data);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200">
      {/* Hamburger */}
      <Button icon={Menu} iconSize={30} onClick={onToggleNav}  scale={50} className="-ml-4"/>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#D9D9D9] opacity-70 rounded-lg px-5 py-2 flex-1 shadow-md">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="bg-transparent outline-none text-sm w-full"
        />
      </div>

      {/* Avatar + Dropdown — hanya tampil kalau sudah login */}
      {user && (
        <div className="relative ml-auto">
          <button onClick={() => setShowDropdown(!showDropdown)}>
            {user?.avatar_url
              ? <img src={user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
              : <div className="w-9 h-9 rounded-full bg-gray-300" />
            }
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-lg border border-black/10 w-40 overflow-hidden">
                <button
                  onClick={() => { router.push("/account"); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  Account
                </button>
                <hr className="border-black/10" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}