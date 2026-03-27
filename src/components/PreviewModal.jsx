"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PreviewModal({ order, deliverable, onClose, onApprove, onRevision }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Mengunci scroll pada body agar tidak bergerak saat modal aktif
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted || !order || !deliverable) return null;

  const modalContent = (
    /* Menggunakan z-[9999] agar berada di atas TopBar dan Sidebar */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay Background - Klik untuk menutup */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
        onClick={onClose} 
      />
      
      {/* Kontainer Modal */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <div 
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Preview Desain</h2>
            <p className="text-sm text-gray-500">Order: {order.title}</p>
          </div>
          <hr className="border-black/10 mx-8" />
          
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {deliverable.preview_urls?.map((url, index) => (
                <img key={index} src={url} className="w-full rounded-xl object-cover h-32 bg-black/5" alt="preview" />
              ))}
            </div>

            {deliverable.note && (
              <div className="bg-white p-4 rounded-xl border">
                <p className="text-sm text-gray-500">Catatan:</p>
                <p className="font-medium">{deliverable.note}</p>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mt-2">
              <p className="text-xs text-yellow-700">
                ⚠️ Tekan <strong>Approve</strong> untuk mencairkan dana ke desainer dan membuka Link Google Drive. <br/><br/>
                Jika Anda tidak merespons dalam <strong>1x24 Jam</strong>, sistem akan otomatis mencairkan dana.
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50 rounded-b-3xl border-t">
            <button onClick={onClose} className="px-6 py-2 border rounded-xl font-medium text-sm">Tutup</button>
            <div className="flex gap-3">
              <button onClick={onRevision} className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-xl font-medium text-sm">Revisi</button>
              <button onClick={onApprove} className="px-6 py-2 bg-black text-white rounded-xl font-medium shadow-md text-sm">Approve ✓</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}