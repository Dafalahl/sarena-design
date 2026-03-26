"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EditProfileModal({ user, profile, onClose, onSaved }) {
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
    setSaving(false);
    onSaved();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold">Edit Profil</h2>
          </div>

          <hr className="border-black/10 mx-8" />

          {/* Form */}
          <div className="px-8 py-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Nama Lengkap</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border border-black/20 rounded-lg px-3 py-2 outline-none bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-black/20 rounded-lg px-3 py-2 outline-none bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="border border-black/20 rounded-lg px-3 py-2 outline-none resize-none h-28 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Banner</label>
              <div className="border border-black/20 rounded-lg overflow-hidden bg-white">
                {bannerPreview && (
                  <img
                    src={bannerPreview}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3">
                  <input
                    id="bannerInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerChange}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("bannerInput").click()
                    }
                    className="w-full text-sm px-3 py-2 border border-black/20 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {bannerFile ? "Ganti Banner" : "Pilih Banner"}
                  </button>
                </div>
              </div>
            </div>
            <h3 className="font-semibold">Info Pencairan Dana</h3>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Metode Pencairan</label>
              <select
                value={disbursementChannel}
                onChange={(e) => setDisbursementChannel(e.target.value)}
                className="border border-black/20 rounded-lg px-3 py-2 outline-none bg-white"
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
                {disbursementChannel === "GOPAY" ||
                disbursementChannel === "OVO" ||
                disbursementChannel === "DANA"
                  ? "Nomor HP"
                  : "Nomor Rekening"}
              </label>
              <input
                value={disbursementAccount}
                onChange={(e) => setDisbursementAccount(e.target.value)}
                placeholder={
                  disbursementChannel === "GOPAY"
                    ? "08xxxxxxxxxx"
                    : "Nomor rekening"
                }
                className="border border-black/20 rounded-lg px-3 py-2 outline-none bg-white"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">
                Nama Pemilik Rekening
              </label>
              <input
                value={disbursementName}
                onChange={(e) => setDisbursementName(e.target.value)}
                placeholder="Nama sesuai rekening"
                className="border border-black/20 rounded-lg px-3 py-2 outline-none bg-white"
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
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
