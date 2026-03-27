"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react"; // FIXED: Import useEffect & useState

export default function PostDetailModal({ post, onClose, onDelete, isOwner }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // FIXED: Pastikan mounted di-set ke true setelah komponen masuk ke client-side
  useEffect(() => {
    setMounted(true);
    // Mencegah scrolling pada body saat modal terbuka
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* LAYER 1: Background Overlay (Blur) 
        - fixed inset-0: Menutupi seluruh layar.
        - bg-black/40: Memberikan efek gelap transparan.
        - backdrop-blur-sm: Memberikan efek blur.
      */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose} // FIXED: Klik di sini akan menutup modal
      />

      {/* LAYER 2: Modal Container 
        - pointer-events-none: Agar area transparan di sekitar kotak putih tidak menghalangi klik ke overlay.
      */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // FIXED: Mencegah modal tertutup saat konten diklik
        >
          {/* Header — info designer */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity w-fit"
              onClick={() => {
                router.push(`/designer/${post.designer_id}`);
                onClose();
              }}
            >
              <img
                src={post.users?.avatar_url || "/default-avatar.png"}
                className="w-10 h-10 rounded-full object-cover"
                alt="Avatar"
              />
              <p className="font-semibold">{post.users?.full_name || "Designer"}</p>
            </div>
            
            {/* Tombol X Kecil (Opsional tapi disarankan) */}
            <button onClick={onClose} className="text-gray-400 hover:text-black">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Konten Scrollable */}
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            <img
              src={post.image_url}
              className="w-full rounded-xl object-contain max-h-96 bg-black/5"
              alt="Post Content"
            />
            {post.caption && (
              <p className="text-sm text-gray-600 leading-relaxed">{post.caption}</p>
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

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Tutup
            </button>

            {isOwner && (
              <button
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin menghapus postingan ini?")) {
                    onDelete(post.id);
                  }
                }}
                className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}