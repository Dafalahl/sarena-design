"use client";

import { useState, useEffect } from "react"; // FIXED: Tambahkan useEffect
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function OrderModal({ designer, profile, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // FIXED: Trigger mounted untuk Portal dan lock scroll background agar tidak bergeser
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = async () => {
    if (!title || !description || !deadline) {
      alert("Semua field harus diisi!");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        alert("Silakan login terlebih dahulu.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("orders").insert({
        client_id: authUser.id,
        creator_id: designer.id,
        title,
        brief_message: description,
        deadline,
        status: "incoming",
      });

      if (error) throw error;

      alert("Request berhasil dikirim!");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim request!");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* LAYER 1: Background Blur Overlay 
          - fixed inset-0: Menutupi seluruh viewport (termasuk Sidebar)
          - onClick: Menutup modal saat area blur diklik
      */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* LAYER 2: Modal Container */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Mencegah modal tertutup saat konten diklik
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Request Order</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1 transition-colors">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Scrollable content */}
          <div className="px-8 py-6 flex flex-col gap-5 overflow-y-auto">
            {/* Designer card */}
            <div className="bg-[#F2A7A7]/30 rounded-2xl p-4 flex items-center gap-4 border border-[#F2A7A7]/50">
              <img
                src={designer?.avatar_url || "/default-avatar.png"}
                className="w-14 h-14 rounded-full object-cover shadow-sm"
                alt="Designer Avatar"
              />
              <div>
                <p className="font-bold text-gray-800">
                  {profile?.username ? `@${profile.username}` : designer?.full_name}
                </p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-tight">
                  Professional Designer
                </p>
              </div>
            </div>

            {/* Judul Project */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Judul Project</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Logo Startup Teknologi"
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-black transition-colors"
              />
            </div>

            {/* Deskripsi */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Deskripsi Brief</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kebutuhan desainmu, gaya yang diinginkan, dsb..."
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-black transition-colors resize-none h-32 text-sm leading-relaxed"
              />
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Deadline Target</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-black transition-colors"
              />
            </div>

            {/* Info escrow */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <p className="text-xs text-yellow-800 leading-normal">
                <b>Sistem Escrow ArtNesia:</b> Pembayaran hanya dilakukan setelah desainer menyetujui harga. 
                Dana Anda akan ditahan dengan aman dan hanya dikirim ke desainer setelah Anda menyetujui hasil karya akhir.
              </p>
            </div>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer tombol */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-all font-medium text-sm shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Request →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}