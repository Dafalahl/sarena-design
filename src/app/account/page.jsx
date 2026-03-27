"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import EditProfileModal from "@/components/EditProfileModal";
import PostDetailModal from "@/components/PostDetailModal";
import BecomeDesignerModal from "@/components/BecomeDesignerModal";
import Button from "@/components/ui/button";
import AuthGuardModal from "@/components/AuthGuardModal";

export default function AccountPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true = authenticated, false = not authenticated
  const [user, setUser] = useState(null);
  const [isDesigner, setIsDesigner] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBecomeDesignerModal, setShowBecomeDesignerModal] = useState(false);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchPosts = async (designerId) => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("designer_id", designerId)
      .order("created_at", { ascending: false });
    setPosts(data || []);
  };

  const fetchUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();
    setUser(data);
    setIsDesigner(data?.is_designer || false);

    if (data?.is_designer) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      setProfile(profileData);
      await fetchPosts(authUser.id);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Check authentication first
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Fetch user data
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      setUser(data);
      setIsDesigner(data?.is_designer || false);

      if (data?.is_designer) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setProfile(profileData);
        await fetchPosts(authUser.id);
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleBecomeDesignerSuccess = async () => {
    setShowBecomeDesignerModal(false);
    setIsDesigner(true);
    await fetchUser();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewFile(URL.createObjectURL(file));
    setShowUploadForm(true);
  };

  const handleUploadPost = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const fileExt = selectedFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("posts")
      .upload(filePath, selectedFile);

    if (uploadError) {
      alert("Gagal upload foto");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("posts")
      .getPublicUrl(filePath);

    await supabase.from("posts").insert({
      designer_id: user.id,
      image_url: urlData.publicUrl,
      caption,
    });

    setUploading(false);
    setShowUploadForm(false);
    setCaption("");
    setPreviewFile(null);
    setSelectedFile(null);
    fetchPosts(user.id);
  };

  const handleDeletePost = async (post) => {
    const urlParts = post.image_url.split("/posts/")[1];
    await supabase.storage.from("posts").remove([urlParts]);
    await supabase.from("posts").delete().eq("id", post.id);
    setSelectedPost(null);
    fetchPosts(user.id);
  };

  if (loading) return <div />;

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Account" isOpen={isNavOpen} />
      </div>

      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-50 bg-white">
          <TopBar onToggleNav={() => setIsNavOpen(!isNavOpen)} />
        </div>

        <main className="flex flex-col">
          {/* Banner */}
          {isDesigner && (
            <div className="mx-6 mt-6 mb-6 rounded-2xl">
              <div className="bg-[#D9D9D9]/70 rounded-2xl h-40 overflow-hidden">
                {profile?.banner_url ? (
                  <img
                    src={profile.banner_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            </div>
          )}

          {/* Avatar + Nama + Tombol Edit */}
          <div className="flex items-center gap-4 px-8 mt-6 mb-8 justify-between">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar_url}
                className="w-24 h-24 rounded-full shadow-md"
              />
              <div>
                <p className="text-2xl font-bold">{user?.full_name}</p>
                {isDesigner && profile?.username && (
                  <p className="text-sm text-gray-400">@{profile.username}</p>
                )}
                {isDesigner && profile?.bio && (
                  <p className="text-sm text-gray-500 mt-1 max-w-xs">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
            {isDesigner && (
              <Button
                label="Edit Profil"
                onClick={() => setShowEditModal(true)}
              />
            )}
          </div>

          {/* Portfolio */}
          {isDesigner && (
            <>
              <div className="relative flex items-center px-8 mb-6 mt-4">
                <hr className="flex-1 border-black/10" />
                <span className="absolute left-1/2 -translate-x-1/2 bg-white px-4 text-sm font-medium">
                  Portfolio
                </span>
                <hr className="flex-1 border-black/10" />
              </div>

              {/* Masonry Grid */}
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 px-8 mb-16 space-y-4">
                {/* Tombol Upload */}
                <div
                  className="break-inside-avoid rounded-2xl h-48 bg-[#D9D9D9]/40 border-2 border-dashed border-black/20 flex flex-col items-center justify-center cursor-pointer hover:bg-[#D9D9D9]/70 transition-colors"
                  onClick={() => document.getElementById("postInput").click()}
                >
                  <span className="text-3xl text-black/30">+</span>
                  <p className="text-sm text-black/40 mt-1">Upload foto</p>
                  <input
                    id="postInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Post Cards */}
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="break-inside-avoid rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition-shadow border-[0.2px] border-black/30"
                    onClick={() => setSelectedPost(post)}
                  >
                    <img src={post.image_url} className="w-full object-cover" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Become a Designer */}
          {!isDesigner && (
            <div className="flex flex-col gap-2 px-8 mt-8 max-w-sm">
              <hr className="border-black/10" />
              <p className="text-sm text-gray-500">Ingin menjadi designer?</p>
              <button
                onClick={() => setShowBecomeDesignerModal(true)}
                className="py-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
              >
                Become a Designer
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchUser();
          }}
        />
      )}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowUploadForm(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div
              className="bg-[#F0F0F0] rounded-3xl w-full max-w-md shadow-xl pointer-events-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 pt-8 pb-4">
                <h2 className="text-2xl font-bold">Upload Postingan</h2>
              </div>
              <hr className="border-black/10 mx-8" />
              <div className="px-8 py-6 flex flex-col gap-4">
                {previewFile && (
                  <img
                    src={previewFile}
                    className="w-full rounded-xl object-contain max-h-64"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-500">
                    Caption (opsional)
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tulis caption..."
                    className="border border-black/20 rounded-lg px-3 py-2 outline-none resize-none h-24 bg-white"
                  />
                </div>
              </div>
              <hr className="border-black/10 mx-8" />
              <div className="flex items-center justify-between px-8 py-6">
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setPreviewFile(null);
                    setSelectedFile(null);
                  }}
                  className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handleUploadPost}
                  disabled={uploading}
                  className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium disabled:opacity-50"
                >
                  {uploading ? "Mengupload..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={() => handleDeletePost(selectedPost)}
        />
      )}
      {showBecomeDesignerModal && (
        <BecomeDesignerModal
          user={user}
          onClose={() => setShowBecomeDesignerModal(false)}
          onSuccess={handleBecomeDesignerSuccess}
        />
      )}
      {isAuthenticated === false && <AuthGuardModal />}
    </div>
  );
}
