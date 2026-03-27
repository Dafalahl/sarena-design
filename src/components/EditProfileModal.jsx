"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

export default function EditProfileModal({ user, profile, onClose, onSaved }) {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [disbursementChannel, setDisbursementChannel] = useState(
    profile?.disbursement_channel || "",
  );
  const [disbursementAccount, setDisbursementAccount] = useState(
    profile?.disbursement_account || "",
  );
  const [disbursementName, setDisbursementName] = useState(
    profile?.disbursement_name || "",
  );
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(
    profile?.banner_url || null,
  );

  // FIXED: Trigger mounted untuk Portal dan mengunci scroll body
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBannerPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);

    let bannerUrl = profile?.banner_url;

    try {
      // Upload banner jika ada file baru
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const filePath = `${user.id}/banner.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("banners")
          .upload(filePath, bannerFile, { upsert: true });

        if (uploadError) {
          alert("Gagal upload banner");
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("banners")
          .getPublicUrl(filePath);

        bannerUrl = urlData.publicUrl;
      }

      // Update nama di tabel users
      await supabase
        .from("users")
        .update({ full_name: fullName })
        .eq("id", user.id);

      await supabase
        .from("profiles")
        .update({
          username,
          bio,
          banner_url: bannerUrl,
          disbursement_channel: disbursementChannel,
          disbursement_account: disbursementAccount,
          disbursement_name: disbursementName,
        })
        .eq("id", user.id);
      
      onSaved();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setSaving(false);
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
            <h2 className="text-2xl font-bold">Edit Profil</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-black p-1">
              ✕
            </button>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Form - Scrollable Area */}
          <div className="px-8 py-6 flex flex-col gap-4 overflow-y-auto">
            {/* Banner Section */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-500 font-medium">Banner Profil</label>
              <div className="relative border border-black/10 rounded-xl overflow-hidden bg-white group">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    className="w-full h-32 object-cover"
                    alt="Banner preview"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    Belum ada banner
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button
                    type="button"
                    onClick={() => document.getElementById("bannerInput").click()}
                    className="bg-white/90 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm hover:bg-white"
                  >
                    Ganti Banner
                  </button>
                </div>
                <input
                  id="bannerInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerChange}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Nama Lengkap</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border border-black/10 rounded-lg px-3 py-2 outline-none bg-white focus:border-black transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Username</label>
              <div className="flex items-center border border-black/10 rounded-lg bg-white overflow-hidden focus-within:border-black transition-colors">
                <span className="pl-3 text-gray-400 text-sm">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  className="flex-1 px-1 py-2 outline-none bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan sedikit tentang dirimu..."
                className="border border-black/10 rounded-lg px-3 py-2 outline-none resize-none h-24 bg-white focus:border-black transition-colors text-sm"
              />
            </div>

            <hr className="border-black/10 my-2" />
            <h3 className="font-semibold text-gray-700">Info Pencairan Dana</h3>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Metode Pencairan</label>
              <select
                value={disbursementChannel}
                onChange={(e) => setDisbursementChannel(e.target.value)}
                className="border border-black/10 rounded-lg px-3 py-2 outline-none bg-white focus:border-black transition-colors"
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
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                {["GOPAY", "OVO", "DANA"].includes(disbursementChannel)
                  ? "Nomor HP"
                  : "Nomor Rekening"}
              </label>
              <input
                value={disbursementAccount}
                onChange={(e) => setDisbursementAccount(e.target.value)}
                placeholder={
                  ["GOPAY", "OVO", "DANA"].includes(disbursementChannel)
                    ? "08xxxxxxxxxx"
                    : "Nomor rekening"
                }
                className="border border-black/10 rounded-lg px-3 py-2 outline-none bg-white focus:border-black transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Nama Pemilik Rekening</label>
              <input
                value={disbursementName}
                onChange={(e) => setDisbursementName(e.target.value)}
                placeholder="Nama sesuai rekening"
                className="border border-black/10 rounded-lg px-3 py-2 outline-none bg-white focus:border-black transition-colors"
              />
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
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}