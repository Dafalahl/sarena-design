"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import PostDetailModal from "@/components/PostDetailModal";

export default function InspirationPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // Fetch current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch semua posts + data user pemiliknya
      const { data } = await supabase
        .from("posts")
        .select("*, users(full_name, avatar_url)")
        .order("created_at", { ascending: false });

      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setPosts(shuffled);
      setLoading(false);
    };

    init();
  }, []);

  const handleDeletePost = async (post) => {
    const urlParts = post.image_url.split("/posts/")[1];
    await supabase.storage.from("posts").remove([urlParts]);
    await supabase.from("posts").delete().eq("id", post.id);
    setSelectedPost(null);
    setPosts(posts.filter((p) => p.id !== post.id));
  };

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Inspiration" isOpen={isOpen} />
      </div>

      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-30 bg-white">
          <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
        </div>

        <main className="p-8">
          {loading ? (
            <div className="text-gray-400">Memuat...</div>
          ) : posts.length === 0 ? (
            <p className="text-gray-400 text-center mt-20">Belum ada postingan.</p>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="break-inside-avoid rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition-shadow relative group"
                  onClick={() => setSelectedPost(post)}
                >
                  <img src={post.image_url} className="w-full object-cover" />

                  {/* Overlay hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation(); // biar ga buka modal
                        router.push(`/designer/${post.designer_id}`);
                      }}
                    >
                      <img
                        src={post.users?.avatar_url}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <p className="text-white text-sm font-medium">
                        {post.users?.full_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={() => handleDeletePost(selectedPost)}
          isOwner={selectedPost.designer_id === currentUserId}
        />
      )}
    </div>
  );
}