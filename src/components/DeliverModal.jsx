"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function DeliverModal({ order, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [gdriveLink, setGdriveLink] = useState("");
  const [mounted, setMounted] = useState(false);
  
  // State untuk multiple preview files
  const [previewFiles, setPreviewFiles] = useState([]);
  const [previewObjectURLs, setPreviewObjectURLs] = useState([]);

  // FIXED: Inisialisasi portal dan kunci scroll body
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handlePreviewFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (files.length > 5) {
      alert("Maksimal 5 gambar preview!");
      return;
    }

    const overSize = files.some(file => file.size > 5 * 1024 * 1024);
    if (overSize) {
      alert("Ada gambar yang lebih dari 5MB. Silakan kompres dulu.");
      return;
    }

    setPreviewFiles(files);
    setPreviewObjectURLs(files.map(file => URL.createObjectURL(file)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (previewFiles.length === 0 || !gdriveLink) {
      alert("Harap masukkan gambar preview dan link GDrive!");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrls = [];
      for (const file of previewFiles) {
        const fileName = `preview_${Date.now()}_${order.id}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("deliverables")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("deliverables")
          .getPublicUrl(fileName);
          
        uploadedUrls.push(publicUrl);
      }

      const { error: dbError } = await supabase.from("deliverables").insert({
        order_id: order.id,
        preview_urls: uploadedUrls,
        original_file_url: gdriveLink,
        note: note,
      });

      if (dbError) throw dbError;

      await supabase
        .from("orders")
        .update({ 
          status: "delivered",
          updated_at: new Date().toISOString() 
        })
        .eq("id", order.id);

      onUpdate();
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim hasil desain.");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Jangan render portal sebelum client-side mounted
  if (!mounted) return null;

  const modalContent = (
    /* FIXED: Container utama dengan z-[9999] agar di atas TopBar */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      
      {/* FIXED: Overlay Blur dengan pointer cursor untuk indikasi klik luar */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
        onClick={onClose} 
      />

      {/* FIXED: Kontainer Form (pointer-events-none di parent agar klik tembus ke overlay) */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <form 
          onSubmit={handleSubmit} 
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Mencegah form menutup saat diklik di dalam
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Kirim Hasil Desain</h2>
            <p className="text-sm text-gray-500">Order: {order.title}</p>
          </div>
          <hr className="border-black/10 mx-8" />

          {/* Scrollable Content */}
          <div className="px-8 py-6 flex flex-col gap-6 overflow-y-auto">
            <div>
              <label className="block text-sm font-semibold mb-2">1. Gambar Preview (Maks. 5 gambar)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                multiple
                required
                onChange={handlePreviewFilesChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-gray-200 file:border-0 file:cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {previewObjectURLs.map((url, i) => (
                  <img key={i} src={url} alt={`prev-${i}`} className="w-full h-20 object-cover rounded-xl bg-black/5" />
                ))}
              </div>
            </div>

            <hr className="border-black/10" />

            <div>
              <label className="block text-sm font-semibold mb-2">2. Link Google Drive (File Asli)</label>
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl mb-2">
                <p className="text-[11px] text-green-700 leading-tight">
                  Pastikan setting akses GDrive Anda adalah <strong>"Siapa saja yang memiliki link dapat melihat"</strong>.
                </p>
              </div>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={gdriveLink}
                onChange={(e) => setGdriveLink(e.target.value)}
                className="w-full p-3 rounded-xl border outline-none bg-white focus:border-black transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Catatan Klien</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Tambahkan pesan jika diperlukan..."
                className="w-full p-3 border rounded-xl outline-none bg-white focus:border-black transition-colors" 
                rows={2} 
              />
            </div>
          </div>

          {/* Footer - Sticky at bottom */}
          <div className="flex justify-between px-8 py-6 rounded-b-3xl bg-white border-t">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-2 border rounded-xl hover:bg-gray-100 font-medium transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-8 py-2 bg-black text-white rounded-xl font-medium shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}