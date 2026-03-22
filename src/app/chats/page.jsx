"use client";

import { useState } from "react";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

export default function ChatsPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <SideNav active="Chats" isOpen={isOpen} isDesigner={isDesigner} />
      <div className="flex flex-col flex-1">
        <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
      </div>
    </div>
  );
}