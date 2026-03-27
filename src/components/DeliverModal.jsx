"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/button";

export default function DeliverModal({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  
  // State untuk File Preview (Max 10MB)
  const [previewFile, setPreviewFile] = useState(null);
  const [previewObjectURL, setPreviewObjectURL] = useState(null);

  // State untuk File Asli (ZIP/Source/Max 100MB+)
  const [originalFile, setOriginalFile] = useState(null);

  // Handle Pilih File Preview
  const handlePreviewFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    // Batas max 10MB untuk preview
    if (selected.size > 10 * 1024 * 1024) {
      alert("Ukuran file preview terlalu besar! Maksimal 10MB. Gunakan resolusi rendah.");
      return;
    }
    setPreviewFile(selected);
    setPreviewObjectURL(URL.createObjectURL(selected));
  };

  // Handle Pilih File Asli
  const handleOriginalFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    // Batas max bisa Anda atur, misal 150MB
    if (selected.size > 150 * 1024 * 1024) {
      alert("Ukuran file asli terlalu besar! Maksimal 150MB.");
      return;
    }
    setOriginalFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewFile || !originalFile) {
      alert("Anda harus mengupload kedua file (Preview & Original)!");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload File Preview ke bucket Publik
      const previewFileName = `preview_${Date.now()}_${order.id}_${previewFile.name}`;
      const { data: previewUpload, error: previewUploadError } = await supabase.storage
        .from("deliverables") // Asumsi bucket ini Public
        .upload(previewFileName, previewFile);

      if (previewUploadError) throw previewUploadError;

      const { data: { publicUrl: previewPublicUrl } } = supabase.storage
        .from("deliverables")
        .getPublicUrl(previewFileName);

      // 2. Upload File Asli ke bucket Privat (Baru)
      const originalFileName = `original_${Date.now()}_${order.id}_${originalFile.name}`;
      const { data: originalUpload, error: originalUploadError } = await supabase.storage
        .from("original-deliverables") // Wadah Privat
        .upload(originalFileName, originalFile);

      if (originalUploadError) throw originalUploadError;

      // Catatan: getPublicUrl di bucket privat akan error/tidak bisa diakses publik.
      // Kita simpan saja path-nya dulu di DB.
      const originalPath = originalFileName;

      // 3. Simpan data ke tabel deliverables
      const { error: dbError } = await supabase.from("deliverables").insert({
        order_id: order.id,
        creator_id: order.creator_id,
        file_url: previewPublicUrl, // Link Gambar Pecah
        original_file_url: originalPath, // Path File Asli (Rahasia)
        original_file_name: originalFile.name,
        note: note,
      });

      if (dbError) throw dbError;

      // 4. Update status order menjadi delivered
      await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order.id);

      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim hasil desain. Pastikan koneksi stabil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Kirim Hasil Desain</h2>
            <p className="text-sm text-gray-500 mt-1">Order: {order.title}</p>
          </div>
          <hr className="border-black/10 mx-8" />

          <div className="px-8 py-6 flex flex-col gap-6 overflow-y-auto">
            {/* INPUT 1: Preview (Mencegah Pencurian) */}
            <div>
              <label className="block text-sm font-semibold mb-2">1. File Preview (Gambar Pecah/Watermark)</label>
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl mb-3">
                <p className="text-xs text-red-600 font-medium">
                  Upload gambar resolusi rendah atau ber-watermark di sini. Klien bisa menyimpan gambar ini tanpa membayar.
                </p>
              </div>
              <input
                type="file"
                accept="image/png, image/jpeg"
                required
                onChange={handlePreviewFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-black hover:file:bg-gray-300"
              />
              {previewObjectURL && (
                <img src={previewObjectURL} alt="preview" className="w-full mt-3 rounded-xl max-h-40 object-contain bg-black/5" />
              )}
            </div>

            <hr className="border-black/10" />

            {/* INPUT 2: File Asli (Menahan Pembayaran) */}
            <div>
              <label className="block text-sm font-semibold mb-2">2. File Asli (Source File / High-Res / ZIP)</label>
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl mb-3">
                <p className="text-xs text-green-600 font-medium">
                  Klien TIDAK BISA mengakses file ini sampai dana cair ke dompet Anda.
                </p>
              </div>
              <input
                type="file"
                accept=".zip,.rar,.psd,.ai,.tiff,.png,.jpg,.jpeg" // Sesuaikan accept-nya
                required
                onChange={handleOriginalFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
              />
              {originalFile && (
                <p className="text-sm mt-2 font-mono text-gray-700">Terpilih: {originalFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Catatan untuk Klien</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl bg-white outline-none focus:border-black"
                rows={3}
                placeholder="Tuliskan pesan singkat..."
              />
            </div>
          </div>

          <hr className="border-black/10 mx-8" />
          <div className="flex items-center justify-between px-8 py-6 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded-xl hover:bg-gray-100 transition-colors font-medium">
              Batal
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium disabled:opacity-50">
              {loading ? "Mengirim..." : "Kirim Hasil"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}