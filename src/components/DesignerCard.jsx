// components/DesignerCard.jsx
import Link from "next/link";

export default function DesignerCard({ designer }) {
  return (
    <Link href={`/designer/${designer.id}`}>
      <div className="bg-[#D9D9D9]/40 rounded-2xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer">
        {/* Avatar */}
        <img
          src={designer.avatar_url}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />

        {/* Info */}
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{designer.profiles?.username || designer.full_name}</p>
          <p className="text-sm text-gray-500">@{designer.profiles?.username || "username"}</p>
          <p className="text-xs font-bold">followers</p>
          <p className="text-xs text-gray-500">jobs</p>
        </div>
      </div>
    </Link>
  );
}