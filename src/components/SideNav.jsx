"use client";

import Image from "next/image";
import Link from "next/link";
import { User, Lightbulb, UserSearch, MessageSquare, Briefcase, Package } from "lucide-react";

const navItems = [
  { label: "Account", icon: User, href: "/account" },
  { label: "Inspiration", icon: Lightbulb, href: "/inspiration" },
  { label: "Find Designer", icon: UserSearch, href: "/find-designer" },
  { label: "Contact", icon: MessageSquare, href: "/contact" },
  { label: "Your Work", icon: Briefcase, href: "/your-work" },
  { label: "Orders", icon: Package, href: "/orders" },
];

export default function SideNav({ active, isOpen }) {
  return (
    <aside className={`border-r border-gray-200 flex flex-col py-4 px-3 transition-all duration-300 ${isOpen ? "w-56" : "w-16"}`}>
      {/* Logo / Icon */}
      <div className="mb-8 px-2">
        <Link href="/">
          {isOpen
            ? <Image src="/logo.svg" alt="Sarena" width={140} height={60} />
            : <Image src="/icon.svg" alt="Sarena" width={32} height={32} />
          }
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
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