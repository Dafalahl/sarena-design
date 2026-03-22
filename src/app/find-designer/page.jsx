"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import Link from "next/link";
import DesignerCard from "@/components/DesignerCard";

export default function FindDesignerPage() {
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isDesigner, setIsDesigner] = useState(false);

  useEffect(() => {
    const fetchDesigners = async () => {
      // Fetch semua user yang is_designer = true beserta profilnya
      const { data } = await supabase
        .from("users")
        .select("id, full_name, avatar_url, profiles(username, bio)")
        .eq("is_designer", true);

      setDesigners(data || []);
      setLoading(false);
    };

    const fetchCurrentUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from("users")
        .select("is_designer")
        .eq("id", authUser.id)
        .single();
      setIsDesigner(data?.is_designer || false);
    };

    fetchDesigners();
    fetchCurrentUser();
  }, []);

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Find Designer" isOpen={isOpen}/>
      </div>
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-30 bg-white">
          <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
        </div>

        <main className="p-6">
          {loading ? (
            <div>Loading...</div>
          ) : (
           <div className="grid grid-cols-2 gap-4 p-6">
              {designers.map((designer) => (
                <DesignerCard key={designer.id} designer={designer} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}