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
    // Struktur Pembungkus Utama (Sama seperti OrderDetailModal)
    // z-[9999] memastikan ini di atas segalanya, termasuk TopBar
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      
      {/* LAYER 1: Backdrop Overlay (Blur) */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" 
        onClick={onClose} 
      />
      
      {/* LAYER 2: Modal Container */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <div 
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Mencegah modal tutup saat konten diklik
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Preview Desain</h2>
              <p className="text-sm text-gray-500">Order: {order.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1 transition-colors text-xl">
              ✕
            </button>
          </div>
          
          <hr className="border-black/10 mx-8" />
          
          {/* Content - Scrollable */}
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
          
          <hr className="border-black/10 mx-8" />
          
          {/* Footer Action */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button 
              onClick={onClose} 
              className="px-6 py-2 border border-gray-300 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
            >
              Tutup
            </button>
            <div className="flex gap-3">
              <button 
                onClick={onRevision} 
                className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors"
              >
                Revisi
              </button>
              <button 
                onClick={onApprove} 
                className="px-6 py-2 bg-black text-white rounded-xl font-medium shadow-md text-sm hover:bg-black/80 transition-all active:scale-95"
              >
                Approve ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}