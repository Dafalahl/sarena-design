"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// 1. Jangan lupa tambahkan onRevision di daftar props ini
export default function PreviewModal({ order, deliverable, onClose, onApprove, onRevision }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!order || !deliverable) return null;

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Preview Hasil Desain</h2>
              <p className="text-sm text-gray-500 mt-1">Order: {order.title}</p>
            </div>
          </div>
          <hr className="border-black/10 mx-8" />
          
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            <img
              src={deliverable.file_url}
              className="w-full rounded-xl object-contain max-h-64 bg-black/5"
              alt="deliverable preview"
            />
            {deliverable.note && (
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Catatan dari designer:</p>
                <p className="font-medium">{deliverable.note}</p>
              </div>
            )}
            
            {/* Peringatan Auto-Approve (Solusi Celah 6) */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mt-2">
              <p className="text-xs text-yellow-700">
                ⚠️ Tekan <strong>Approve</strong> jika desain sudah sesuai agar dana diteruskan ke desainer dan link download file asli terbuka. <br/><br/>
                <strong>Aturan Sarena:</strong> Jika Anda tidak melakukan Approve atau Minta Revisi dalam waktu <strong>3x24 Jam</strong> setelah desain dikirim, maka order akan dianggap selesai secara otomatis oleh Admin dan dana akan dicairkan ke desainer.
              </p>
            </div>
          </div>

          <hr className="border-black/10 mx-8" />
          
          {/* 2. PERUBAHAN UI TOMBOL ADA DI SINI */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Tutup
            </button>
            <div className="flex gap-3">
              <button
                onClick={onRevision}
                className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-xl hover:bg-red-50 transition-colors font-medium"
              >
                Minta Revisi
              </button>
              <button
                onClick={onApprove}
                className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium shadow-md shadow-green-500/20"
              >
                Approve ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}