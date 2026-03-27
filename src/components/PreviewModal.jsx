"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PreviewModal({ order, deliverable, onClose, onApprove }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Jika tidak ada data order atau deliverable, jangan render apapun
  if (!order || !deliverable) return null;

  const modalContent = (
    <>
      {/* Backdrop (Pakai z-[100] agar di atas SideNav & TopBar) */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      {/* Modal Box */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Hasil Desain</h2>
          </div>
          <hr className="border-black/10 mx-8" />
          
          <div className="px-8 py-6 flex flex-col gap-4">
            <img
              src={deliverable.file_url}
              className="w-full rounded-xl object-contain max-h-64"
              alt="deliverable"
            />
            {deliverable.note && (
              <div>
                <p className="text-sm text-gray-500">Catatan dari designer:</p>
                <p className="font-medium">{deliverable.note}</p>
              </div>
            )}
          </div>

          <hr className="border-black/10 mx-8" />
          
          <div className="flex items-center justify-between px-8 py-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Tutup
            </button>
            <button
              onClick={onApprove}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
            >
              Approve ✓
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Gunakan createPortal agar modal menutupi seluruh halaman
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}