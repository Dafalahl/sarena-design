"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DeliverModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [gdriveLink, setGdriveLink] = useState("");
  
  // State untuk multiple preview files
  const [previewFiles, setPreviewFiles] = useState([]);
  const [previewObjectURLs, setPreviewObjectURLs] = useState([]);

  const handlePreviewFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (files.length > 5) {
      alert("Maksimal 5 gambar preview!");
      return;
    }

    // Validasi ukuran max 5MB per gambar
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
      // 1. Upload semua gambar preview ke Supabase Storage (Public)
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

      // 2. Simpan ke database
      const { error: dbError } = await supabase.from("deliverables").insert({
        order_id: order.id,
        creator_id: order.creator_id,
        preview_urls: uploadedUrls, // Array banyak gambar
        original_file_url: gdriveLink, // Link GDrive (Aman sampai di-approve)
        note: note,
      });

      if (dbError) throw dbError;

      // 3. Update status order menjadi delivered & catat waktu (updated_at)
      await supabase
        .from("orders")
        .update({ 
          status: "delivered",
          updated_at: new Date().toISOString() // Wajib untuk patokan 24 jam!
        })
        .eq("id", order.id);

      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim hasil desain.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <form onSubmit={handleSubmit} className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col max-h-[90vh]">
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Kirim Hasil Desain</h2>
            <p className="text-sm text-gray-500">Order: {order.title}</p>
          </div>
          <hr className="border-black/10 mx-8" />

          <div className="px-8 py-6 flex flex-col gap-6 overflow-y-auto">
            {/* Input Multiple Images */}
            <div>
              <label className="block text-sm font-semibold mb-2">1. Gambar Preview (Bisa pilih s.d 5 gambar)</label>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                multiple
                required
                onChange={handlePreviewFilesChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-gray-200"
              />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {previewObjectURLs.map((url, i) => (
                  <img key={i} src={url} alt={`prev-${i}`} className="w-full h-20 object-cover rounded-xl bg-black/5" />
                ))}
              </div>
            </div>

            <hr className="border-black/10" />

            {/* Input Link GDrive */}
            <div>
              <label className="block text-sm font-semibold mb-2">2. Link Google Drive (File Asli)</label>
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl mb-2">
                <p className="text-xs text-green-700">Pastikan setting akses GDrive Anda adalah "Siapa saja yang memiliki link dapat melihat".</p>
              </div>
              <input
                type="url"
                required
                placeholder="https://drive.google.com/..."
                value={gdriveLink}
                onChange={(e) => setGdriveLink(e.target.value)}
                className="w-full p-3 rounded-xl border outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Catatan Klien</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 border rounded-xl outline-none" rows={2} />
            </div>
          </div>

          <div className="flex justify-between px-8 py-6 rounded-b-3xl bg-white border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded-xl hover:bg-gray-100 font-medium">Batal</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-black text-white rounded-xl font-medium">{loading ? "Mengirim..." : "Kirim"}</button>
          </div>
        </form>
      </div>
    </>
  );
}