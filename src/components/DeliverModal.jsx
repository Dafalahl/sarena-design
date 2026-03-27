"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DeliverModal({ order, onClose, onUpdate }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

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

    // 1. Upload file ke Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${order.id}-${Date.now()}.${fileExt}`;

    console.log("Starting file upload...");
    console.log("File name:", fileName);
    console.log("File size:", file.size);
    console.log("File type:", file.type);

    const { error: uploadError } = await supabase.storage
      .from("deliverables")
      .upload(fileName, file);

    console.log("uploadError:", JSON.stringify(uploadError));

    if (uploadError) {
      console.error("Upload gagal! Error details:", uploadError);
      alert("Gagal upload file!");
      setLoading(false);
      return; // ← ini yang menyebabkan tidak lanjut ke insert
    }

    console.log("Upload berhasil!");

    // 2. Ambil public URL
    console.log("Getting public URL...");
    const { data: urlData } = supabase.storage
      .from("deliverables")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;
    console.log("Public URL:", fileUrl);

    // 3. Simpan ke tabel deliverables
    console.log("Inserting deliverable record...");
    const { error: deliverError } = await supabase.from("deliverables").insert({
      order_id: order.id,
      file_url: fileUrl,
      note,
    });

    console.log("deliverError:", JSON.stringify(deliverError));

    if (deliverError) {
      console.error("Deliver gagal! Error details:", deliverError);
      alert("Gagal menyimpan hasil!");
      setLoading(false);
      return;
    }

    console.log("Deliverable record inserted successfully!");

    // 4. Update status order jadi delivered
    console.log("Updating order status to delivered...");
    await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", order.id);

    console.log("Order status updated successfully!");

    setLoading(false);
    onUpdate();
    onClose();
  };

  return (
    <>
      <div
        className="fixed top-0 right-0 bottom-0 left-56 bg-black/40 backdrop-blur-sm z-45 pointer-events-none"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-46 pointer-events-none\">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Kirim Hasil</h2>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Content */}
          <div className="px-8 py-6 flex flex-col gap-4">
            {/* Upload area */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Upload File Desain
              </label>
              <label className="bg-white rounded-xl border border-black/10 p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                {preview ? (
                  <img
                    src={preview}
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                ) : (
                  <>
                    <p className="text-gray-400 text-sm">
                      Klik untuk pilih file
                    </p>
                    <p className="text-gray-300 text-xs">PNG, JPG, PDF</p>
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
              <label className="text-sm text-gray-500">
                Catatan (opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tambahkan catatan untuk client..."
                className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10 resize-none h-24"
              />
            </div>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
            >
              {loading ? "Mengirim..." : "Kirim Hasil →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
