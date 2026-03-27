"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OrderModal({ designer, profile, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !deadline) {
      alert("Semua field harus diisi!");
      return;
    }

    setLoading(true);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("orders").insert({
      client_id: authUser.id,
      creator_id: designer.id,
      title,
      brief_message: description,
      deadline,
      status: "incoming",
    });

    if (error) {
      console.error(error);
      alert("Gagal mengirim request!");
    } else {
      alert("Request berhasil dikirim!");
      onClose();
    }

    setLoading(false);
  };

  return (
    <>
      {/* Background blur */}
      <div
        className="fixed top-0 right-0 bottom-0 left-56 bg-black/40 backdrop-blur-sm z-45 pointer-events-none"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-46 pointer-events-none">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Request Order</h2>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Scrollable content */}
          <div className="px-8 py-6 flex flex-col gap-5 overflow-y-auto max-h-[60vh]">
            {/* Designer card */}
            <div className="bg-[#F2A7A7]/50 rounded-2xl p-4 flex items-center gap-4">
              <img
                src={designer?.avatar_url}
                className="w-14 h-14 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-lg">
                  {profile?.username || designer?.full_name}
                </p>
                <p className="text-sm text-gray-600">Logo and Brand Identity</p>
              </div>
            </div>

            {/* Judul Project */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Judul Project</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Logo Startup teknologi"
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10"
              />
            </div>

            {/* Deskripsi */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Deskripsi</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kebutuhan desainmu secara detail..."
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 resize-none h-32"
              />
            </div>

            {/* Deadline */}
            <div className="flex flex-col gap-1">
              <label className="font-medium">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10"
              />
            </div>

            {/* Info escrow */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              Pembayaran hanya dilakukan setelah desainer menyetujui order kamu.
              Dana akan ditahan hingga kamu approve hasil karya.
            </div>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer tombol */}
          <div className="flex items-center justify-between px-8 py-6">
            <button
              onClick={onClose}
              className="px-8 py-3 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-white border border-black/20 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
            >
              {loading ? "Mengirim..." : "Kirim Request →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
