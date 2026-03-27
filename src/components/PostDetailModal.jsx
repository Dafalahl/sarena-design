"use client";

import { useRouter } from "next/navigation";

export default function PostDetailModal({ post, onClose, onDelete, isOwner }) {
  const router = useRouter();

  return (
    <>
      <div
        className="fixed top-0 right-0 bottom-0 left-56 bg-black/40 backdrop-blur-sm z-45 pointer-events-none"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-46 pointer-events-none">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — info designer, klik untuk ke profil */}
          <div
            className="px-8 pt-8 pb-4 flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity w-fit"
            onClick={() => {
              router.push(`/designer/${post.designer_id}`);
              onClose();
            }}
          >
            <img
              src={post.users?.avatar_url}
              className="w-10 h-10 rounded-full object-cover"
            />
            <p className="font-semibold">{post.users?.full_name}</p>
          </div>

          <hr className="border-black/10 mx-8" />

          <div className="px-8 py-6 flex flex-col gap-4">
            <img
              src={post.image_url}
              className="w-full rounded-xl object-contain max-h-80"
            />
            {post.caption && (
              <p className="text-sm text-gray-600">{post.caption}</p>
            )}
            <p className="text-xs text-gray-400">
              {new Date(post.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <hr className="border-black/10 mx-8" />

          <div className="flex items-center justify-between px-8 py-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Tutup
            </button>

            {/* Tombol hapus hanya muncul kalau pemilik */}
            {isOwner && (
              <button
                onClick={onDelete}
                className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
