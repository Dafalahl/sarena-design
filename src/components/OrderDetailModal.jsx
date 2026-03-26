"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OrderDetailModal({ order, onClose, onUpdate }) {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTerima = async () => {
    if (!price) {
      alert("Masukkan harga terlebih dahulu!");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "negotiating", amount: parseInt(price) })
      .eq("id", order.id)
      .select();

    console.log("data:", data);
    console.log("error detail:", JSON.stringify(error));
    console.log("order id:", order.id);
    console.log("price:", parseInt(price));

    setLoading(false);
    onUpdate();
    onClose();
  };

  const handleTolak = async () => {
    setLoading(true);
    await supabase
      .from("orders")
      .update({ status: "rejected" })
      .eq("id", order.id);

    setLoading(false);
    onUpdate();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Detail Order</h2>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Content */}
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
            {/* Buyer */}
            <div className="bg-[#F2A7A7]/50 rounded-2xl p-4 flex items-center gap-4">
              <img
                src={order.users?.avatar_url}
                className="w-14 h-14 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">{order.users?.full_name}</p>
                <p className="text-sm text-gray-500">Client</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-gray-500">Judul Project</p>
                <p className="font-medium">{order.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deskripsi</p>
                <p className="font-medium">{order.brief_message}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="font-medium">
                  {new Date(order.deadline).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Input harga */}
            {showPriceInput && (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-500">
                  Masukkan Harga (Rp)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="cth: 300000"
                  className="bg-white rounded-xl px-4 py-3 outline-none border border-black/10"
                />
              </div>
            )}
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6">
            <button
              onClick={handleTolak}
              disabled={loading}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-red-500 hover:text-white transition-colors font-medium"
            >
              Tolak
            </button>

            {!showPriceInput ? (
              <button
                onClick={() => setShowPriceInput(true)}
                className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
              >
                Terima
              </button>
            ) : (
              <button
                onClick={handleTerima}
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
              >
                {loading ? "Mengirim..." : "Kirim Harga →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
