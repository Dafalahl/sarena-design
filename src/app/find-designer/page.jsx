"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import DesignerCard from "@/components/DesignerCard";

export default function FindDesignerPage() {
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchDesigners = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, avatar_url, profiles(username, bio, banner_url)")
        .eq("is_designer", true);

      // Acak urutan
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setDesigners(shuffled);
      setLoading(false);
    };

    fetchDesigners();
  }, []);

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Find Designer" isOpen={isOpen} />
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