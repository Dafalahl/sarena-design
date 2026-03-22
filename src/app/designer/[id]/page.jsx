"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import Button from "@/components/ui/button";
import OrderModal from "@/components/OrderModal";

export default function DesignerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [designer, setDesigner] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isDesigner, setIsDesigner] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  useEffect(() => {
    const fetchDesigner = async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .eq("id", id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, bio")
        .eq("id", id)
        .single();

      setDesigner(userData);
      setProfile(profileData);
      setLoading(false);
    };

    const fetchCurrentUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setIsOwnProfile(authUser.id === id); // ← pindah ke sini

      const { data } = await supabase
        .from("users")
        .select("is_designer")
        .eq("id", authUser.id)
        .single();
      setIsDesigner(data?.is_designer || false);
    };

    fetchDesigner();
    fetchCurrentUser();
  }, [id]);

  if (loading) return <div></div>;

  return (
    <>
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Find Designer" isOpen={isOpen} isDesigner={isDesigner} />
      </div>
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-30 bg-white">
          <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
        </div>

        <main className="flex flex-col">
          <div className="bg-[#D9D9D9]/70 mx-6 mt-6 rounded-2xl h-40 shadow-md mb-6" />

          <div className="flex items-center justify-between px-8 mb-16">
            <div className="flex items-center gap-4">
              <img src={designer?.avatar_url} className="w-24 h-24 rounded-full shadow-md" />
              <div>
                <p className="text-2xl font-bold">{profile?.username || designer?.full_name}</p>
                <p className="text-sm text-gray-500">@{profile?.username || "username"}</p>
                <p className="text-sm text-gray-500 mt-1">{profile?.bio || ""}</p>
              </div>
            </div>

            {isOwnProfile ? (
              <button
                onClick={() => router.push("/account")}
                className="px-6 py-3 border border-black rounded-xl hover:bg-black hover:text-white transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <Button label="Order"  onClick={() => setShowOrder(true)}/>
            )}
          </div>

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
        </main>
      </div>
    </div>

    {/* modal */}
            {showOrder && (
            <OrderModal
                designer={designer}
                profile={profile}
                onClose={() => setShowOrder(false)}
            />
            )}
        </>
  );
}