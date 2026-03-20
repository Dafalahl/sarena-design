import { Search, Menu } from "lucide-react";
import Button from "@/components/ui/button";


export default function TopBar({ onToggleNav }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {/* Hamburger */}
      <Button icon={Menu} iconSize={35} scale={50} onClick={onToggleNav} />

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#D9D9D9]/50 rounded-lg px-5 py-2 w-full max-w-2xl shadow-xl">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="bg-transparent outline-none text-sm w-full"
        />
      </div>
    </div>
  );
}