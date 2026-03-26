"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { goToChat } from "@/lib/chat";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import Button from "@/components/ui/button";
import OrderModal from "@/components/OrderModal";
import PostDetailModal from "@/components/PostDetailModal";

export default function DesignerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [designer, setDesigner] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isDesigner, setIsDesigner] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      // Cek apakah ini profil sendiri → redirect ke /account
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser?.id === id) {
        router.replace("/account");
        return;
      }

      setCurrentUserId(authUser?.id || null);

      // Cek apakah current user adalah designer
      if (authUser) {
        const { data } = await supabase
          .from("users")
          .select("is_designer")
          .eq("id", authUser.id)
          .single();
        setIsDesigner(data?.is_designer || false);
      }

      // Fetch data designer yang dilihat
      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .eq("id", id)
        .single();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, bio, banner_url")
        .eq("id", id)
        .single();

      // Fetch posts designer
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, users(full_name, avatar_url)")
        .eq("designer_id", id)
        .order("created_at", { ascending: false });

      setDesigner(userData);
      setProfile(profileData);
      setPosts(postsData || []);
      setLoading(false);
    };

    init();
  }, [id]);

  const handleChat = async () => {
    if (!currentUserId) {
      alert("Silakan login terlebih dahulu");
      return;
    }
    try {
      await goToChat(router, currentUserId, id);
    } catch (error) {
      console.error(error);
      alert("Gagal membuka chat");
    }
  };

  if (loading) return <div />;

  return (
    <>
      <div className="flex min-h-screen">
        <div className="sticky top-0 h-screen">
          <SideNav
            active="Find Designer"
            isOpen={isOpen}
            isDesigner={isDesigner}
          />
        </div>

        <div className="flex flex-col flex-1">
          <div className="sticky top-0 z-30 bg-white">
            <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
          </div>

          <main className="flex flex-col">
            {/* Banner */}
            <div className="mx-6 mt-6 mb-6">
              <div className="bg-[#D9D9D9]/70 rounded-2xl h-40 shadow-md overflow-hidden">
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

            {/* Avatar + Info + Tombol Order */}
            <div className="flex items-center justify-between px-8 mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={designer?.avatar_url}
                  className="w-24 h-24 rounded-full shadow-md"
                />
                <div>
                  <p className="text-2xl font-bold">{designer?.full_name}</p>
                  {profile?.username && (
                    <p className="text-sm text-gray-400">@{profile.username}</p>
                  )}
                  {profile?.bio && (
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button label="Order" onClick={() => setShowOrder(true)} />
                <Button label="Chat" onClick={handleChat} />
              </div>
            </div>

            {/* Portfolio */}
            <div className="relative flex items-center px-8 mb-6 mt-4">
              <hr className="flex-1 border-black/10" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-white px-4 text-sm font-medium">
                Portfolio
              </span>
              <hr className="flex-1 border-black/10" />
            </div>

            {posts.length === 0 ? (
              <p className="text-gray-400 text-center mt-8 mb-16">
                Belum ada postingan.
              </p>
            ) : (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-4 px-8 mb-16 space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="break-inside-avoid rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => setSelectedPost(post)}
                  >
                    <img src={post.image_url} className="w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Order Modal */}
      {showOrder && (
        <OrderModal
          designer={designer}
          profile={profile}
          onClose={() => setShowOrder(false)}
        />
      )}

      {/* Post Detail Modal — isOwner selalu false karena ini profil orang lain */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          isOwner={false}
        />
      )}
    </>
  );
}
