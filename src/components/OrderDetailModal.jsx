"use client";

import { useState, useEffect } from "react"; // FIXED: Tambahkan useEffect
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function OrderDetailModal({ order, onClose, onUpdate }) {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // FIXED: Trigger mounted untuk Portal dan lock scroll background
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleTerima = async () => {
    if (!price) {
      alert("Masukkan harga terlebih dahulu!");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "negotiating", amount: parseInt(price) })
        .eq("id", order.id)
        .select();

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error update order:", error);
      alert("Gagal memproses order.");
    } finally {
      setLoading(false);
    }
  };

  const handleTolak = async () => {
    if (!confirm("Apakah Anda yakin ingin menolak order ini?")) return;
    
    setLoading(true);
    try {
      await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", order.id);

      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error reject order:", error);
      alert("Gagal menolak order.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* LAYER 1: Backdrop Overlay (Blur) 
          - fixed inset-0: Menutupi seluruh layar (Sidebar & Topbar)
          - onClick: Menutup modal saat area blur diklik
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
            <h2 className="text-2xl font-bold">Detail Order</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1 transition-colors">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Content - Scrollable */}
          <div className="px-8 py-6 flex flex-col gap-5 overflow-y-auto">
            {/* Buyer Card */}
            <div className="bg-[#F2A7A7]/30 rounded-2xl p-4 flex items-center gap-4 border border-[#F2A7A7]/50">
              <img
                src={order.users?.avatar_url || "/default-avatar.png"}
                className="w-14 h-14 rounded-full object-cover shadow-sm"
                alt="Avatar Client"
              />
              <div>
                <p className="font-bold text-gray-800">{order.users?.full_name}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Client</p>
              </div>
            </div>

            {/* Project Info */}
            <div className="space-y-4 bg-white/50 p-5 rounded-2xl border border-black/5">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-400 font-semibold uppercase">Judul Project</p>
                <p className="font-semibold text-gray-800">{order.title}</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-400 font-semibold uppercase">Deskripsi / Brief</p>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  "{order.brief_message || "Tidak ada pesan brief."}"
                </p>
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-400 font-semibold uppercase">Deadline Target</p>
                <p className="font-medium text-gray-800">
                  {new Date(order.deadline).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Input Harga Negotiation */}
            {showPriceInput && (
              <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-bold text-gray-700">
                  Tentukan Harga (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
                  <input
                    type="number"
                    autoFocus
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Contoh: 500000"
                    className="w-full bg-white rounded-xl pl-12 pr-4 py-3 outline-none border border-black/10 focus:border-black transition-colors font-bold text-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 italic">*Harga ini akan dikirimkan ke client untuk disetujui.</p>
              </div>
            )}
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer Action */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button
              onClick={handleTolak}
              disabled={loading}
              className="px-6 py-2 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              Tolak Order
            </button>

            <div className="flex gap-2">
              {showPriceInput && (
                <button
                  onClick={() => setShowPriceInput(false)}
                  className="px-4 py-2 text-gray-400 hover:text-black text-sm font-medium transition-colors"
                >
                  Batal
                </button>
              )}
              
              {!showPriceInput ? (
                <button
                  onClick={() => setShowPriceInput(true)}
                  className="px-8 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-all font-medium text-sm shadow-md active:scale-95"
                >
                  Terima Order
                </button>
              ) : (
                <button
                  onClick={handleTerima}
                  disabled={loading || !price}
                  className="px-8 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-all font-medium text-sm shadow-md disabled:opacity-50 active:scale-95"
                >
                  {loading ? "Mengirim..." : "Kirim Penawaran Harga"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}