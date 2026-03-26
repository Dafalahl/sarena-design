"use client";

import Link from "next/link";

export default function DesignerCard({ designer }) {
  const profile = designer.profiles;

  return (
    <Link href={`/designer/${designer.id}`}>
      <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer h-52 relative bg-[#D9D9D9]">

        {/* Banner sebagai background */}
        {profile?.banner_url ? (
          <img
            src={profile.banner_url}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* Gradasi bawah supaya teks tetap terbaca */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Konten */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3">
          {/* Avatar */}
          <img
            src={designer.avatar_url}
            className="w-12 h-12 rounded-full object-cover border-2 border-white/50 flex-shrink-0"
          />

          {/* Info */}
          <div className="flex flex-col min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {designer.full_name}
            </p>
            {profile?.username && (
              <p className="text-white/70 text-xs truncate">
                @{profile.username}
              </p>
            )}
            {profile?.bio && (
              <p className="text-white/60 text-xs mt-0.5 line-clamp-1">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}