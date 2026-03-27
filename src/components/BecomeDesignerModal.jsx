"use client";

import { useState, useEffect } from "react"; // FIXED: Tambahkan useEffect
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function BecomeDesignerModal({ user, onClose, onSuccess }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [username, setUsername] = useState("");
  const [disbursementChannel, setDisbursementChannel] = useState("");
  const [disbursementAccount, setDisbursementAccount] = useState("");
  const [disbursementName, setDisbursementName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false); // State untuk Portal

  // FIXED: Trigger mounted setelah komponen di-render di client
  useEffect(() => {
    setMounted(true);
    // Mencegah scroll pada background saat modal terbuka
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Nama lengkap wajib diisi";
    if (!username.trim()) newErrors.username = "Username wajib diisi";
    if (!disbursementChannel)
      newErrors.disbursementChannel = "Metode pencairan wajib dipilih";
    if (!disbursementAccount.trim())
      newErrors.disbursementAccount = "Nomor rekening/HP wajib diisi";
    if (!disbursementName.trim())
      newErrors.disbursementName = "Nama pemilik wajib diisi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // Update nama di tabel users
      await supabase
        .from("users")
        .update({ full_name: fullName, is_designer: true })
        .eq("id", user.id);

      // Insert profile
      await supabase.from("profiles").insert({
        id: user.id,
        username,
        disbursement_channel: disbursementChannel,
        disbursement_account: disbursementAccount,
        disbursement_name: disbursementName,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* LAYER 1: Background Overlay (Blur) 
          - fixed inset-0: menutupi seluruh layar (Sidebar & Topbar)
          - onClick: menutup modal saat area blur diklik
      */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* LAYER 2: Modal Container 
          - pointer-events-none: agar area sekitar kotak tidak menghalangi overlay
      */}
      <div className="relative w-full max-w-lg m-4 pointer-events-none flex items-center justify-center">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()} // FIXED: Mencegah modal tertutup saat konten diklik
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Daftar sebagai Designer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Lengkapi info berikut untuk mulai menerima order.
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Form - Scrollable Area */}
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            {/* Nama Lengkap */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`border rounded-lg px-3 py-2 outline-none bg-white transition-colors ${errors.fullName ? "border-red-400" : "border-black/20 focus:border-black"}`}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Username <span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center border rounded-lg bg-white overflow-hidden transition-colors ${errors.username ? "border-red-400" : "border-black/20 focus-within:border-black"}`}>
                <span className="px-3 text-gray-400 text-sm">@</span>
                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/\s/g, "").toLowerCase())
                  }
                  className="flex-1 py-2 pr-3 outline-none bg-white text-sm"
                  placeholder="username_kamu"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            <hr className="border-black/10 my-2" />
            <h3 className="font-semibold text-gray-700">
              Info Pencairan Dana <span className="text-red-500">*</span>
            </h3>

            {/* Metode Pencairan */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Metode Pencairan <span className="text-red-500">*</span>
              </label>
              <select
                value={disbursementChannel}
                onChange={(e) => setDisbursementChannel(e.target.value)}
                className={`border rounded-lg px-3 py-2 outline-none bg-white ${errors.disbursementChannel ? "border-red-400" : "border-black/20"}`}
              >
                <option value="">Pilih metode</option>
                <option value="GOPAY">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="DANA">DANA</option>
                <option value="BCA">Bank BCA</option>
                <option value="BNI">Bank BNI</option>
                <option value="BRI">Bank BRI</option>
                <option value="MANDIRI">Bank Mandiri</option>
              </select>
              {errors.disbursementChannel && (
                <p className="text-xs text-red-500">
                  {errors.disbursementChannel}
                </p>
              )}
            </div>

            {/* Nomor Rekening / HP */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                {["GOPAY", "OVO", "DANA"].includes(disbursementChannel)
                  ? "Nomor HP"
                  : "Nomor Rekening"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                value={disbursementAccount}
                onChange={(e) => setDisbursementAccount(e.target.value)}
                placeholder={
                  ["GOPAY", "OVO", "DANA"].includes(disbursementChannel)
                    ? "08xxxxxxxxxx"
                    : "Nomor rekening"
                }
                className={`border rounded-lg px-3 py-2 outline-none bg-white ${errors.disbursementAccount ? "border-red-400" : "border-black/20"}`}
              />
              {errors.disbursementAccount && (
                <p className="text-xs text-red-500">
                  {errors.disbursementAccount}
                </p>
              )}
            </div>

            {/* Nama Pemilik */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Nama Pemilik Rekening <span className="text-red-500">*</span>
              </label>
              <input
                value={disbursementName}
                onChange={(e) => setDisbursementName(e.target.value)}
                placeholder="Nama sesuai rekening"
                className={`border rounded-lg px-3 py-2 outline-none bg-white ${errors.disbursementName ? "border-red-400" : "border-black/20"}`}
              />
              {errors.disbursementName && (
                <p className="text-xs text-red-500">
                  {errors.disbursementName}
                </p>
              )}
            </div>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Footer */}
          <div className="flex items-center justify-between px-8 py-6 bg-gray-50/50 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Daftar sebagai Designer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}