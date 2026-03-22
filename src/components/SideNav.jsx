"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Lightbulb, UserSearch, MessageSquare, Briefcase, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Account", icon: User, href: "/account", designerOnly: false },
  { label: "Inspiration", icon: Lightbulb, href: "/inspiration", designerOnly: false },
  { label: "Find Designer", icon: UserSearch, href: "/find-designer", designerOnly: false },
  { label: "Chats", icon: MessageSquare, href: "/chats", designerOnly: false },
  { label: "Your Work", icon: Briefcase, href: "/your-work", designerOnly: true },
  { label: "Orders", icon: Package, href: "/orders", designerOnly: false },
];

export default function SideNav({ active, isOpen }) {
  const [isDesigner, setIsDesigner] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from("users")
        .select("is_designer")
        .eq("id", authUser.id)
        .single();
      setIsDesigner(data?.is_designer || false);
    };
    fetchUser();
  }, []);

  const filteredItems = navItems.filter(item => !item.designerOnly || isDesigner);

  return (
    <aside className={`border-r border-gray-200 flex flex-col py-4 px-3 transition-all duration-300 ${isOpen ? "w-56" : "w-16"}`}>
      <div className="mb-8 px-2">
        <Link href="/">
          {isOpen
            ? <Image src="/logo.svg" alt="Sarena" width={140} height={60} />
            : <Image src="/icon.svg" alt="Sarena" width={32} height={32} />
          }
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? "bg-[#F2A7A7]/40 font-bold" : "hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}