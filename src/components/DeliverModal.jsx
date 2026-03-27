"use client";

import { useState, useEffect } from "react"; // FIXED: Tambahkan useEffect
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function DeliverModal({ order, onClose, onUpdate }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mounted, setMounted] = useState(false);

  // FIXED: Trigger mounted untuk Portal dan lock scroll
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (!file) {
      alert("Pilih file terlebih dahulu!");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload file ke Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${order.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("deliverables")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload gagal!", uploadError);
        alert("Gagal upload file!");
        setLoading(false);
        return;
      }

      // 2. Ambil public URL
      const { data: urlData } = supabase.storage
        .from("deliverables")
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // 3. Simpan ke tabel deliverables
      const { error: deliverError } = await supabase.from("deliverables").insert({
        order_id: order.id,
        file_url: fileUrl,
        note,
      });

      if (deliverError) {
        console.error("Simpan record gagal!", deliverError);
        alert("Gagal menyimpan hasil!");
        setLoading(false);
        return;
      }

      // 4. Update status order jadi delivered
      await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order.id);

      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* LAYER 1: Background Overlay (Blur) 
          - fixed inset-0: menutupi seluruh halaman
          - onClick: menutup modal saat area blur diklik
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
          <div className="px-8 pt-8 pb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Kirim Hasil</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-black">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Content - Scrollable */}
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            {/* Upload area */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500 font-medium">
                Upload File Desain
              </label>
              <label className="bg-white rounded-xl border border-dashed border-black/20 p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-black/40 transition-all">
                {preview ? (
                  <div className="relative w-full">
                    <img
                      src={preview}
                      className="w-full max-h-60 object-contain rounded-lg"
                      alt="Preview"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 rounded-lg transition-opacity">
                      <p className="text-white text-sm font-medium">Ganti File</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-black">Klik untuk pilih file</p>
                      <p className="text-gray-400 text-xs mt-1">PNG, JPG, PDF (Maks. 5MB)</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Catatan */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500 font-medium">
                Catatan (opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tambahkan catatan untuk client..."
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-black transition-colors resize-none h-28 text-sm"
              />
            </div>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !file}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Mengirim..." : "Kirim Hasil →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}