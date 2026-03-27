"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import ChatRoom from "@/components/ChatRoom";
import AuthGuardModal from "@/components/AuthGuardModal";

function ChatContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setCurrentUser(userData);
      fetchRooms(authUser.id);
    };

    init();
  }, []);

  const fetchRooms = async (userId) => {
    const { data } = await supabase
      .from("rooms")
      .select(
        `
        id, created_at,
        client:client_id(id, full_name, avatar_url),
        designer:designer_id(id, full_name, avatar_url),
        messages(content, message_type, created_at)
      `,
      )
      .or(`client_id.eq.${userId},designer_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    setRooms(data || []);
    setLoading(false);

    const targetDesignerId = searchParams.get("designerId");
    if (targetDesignerId && data) {
      const targetRoom = data.find(
        (r) =>
          r.designer?.id === targetDesignerId ||
          r.client?.id === targetDesignerId,
      );
      if (targetRoom) setSelectedRoom(targetRoom);
    }
  };

  const getOtherUser = (room) => {
    if (!currentUser) return null;
    return room.client?.id === currentUser.id ? room.designer : room.client;
  };

  const getLastMessage = (room) => {
    if (!room.messages || room.messages.length === 0) return "Belum ada pesan";
    const last = room.messages[room.messages.length - 1];
    if (last.message_type === "file") return "📎 File";
    if (last.message_type === "order_ref") return "📋 Order";
    return last.content;
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-72 border-r border-black/10 flex flex-col overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400 text-sm">Memuat...</div>
        ) : rooms.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">Belum ada chat.</div>
        ) : (
          rooms.map((room) => {
            const other = getOtherUser(room);
            return (
              <div
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedRoom?.id === room.id ? "bg-gray-100" : ""}`}
              >
                <img
                  src={other?.avatar_url}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt="avatar"
                />
                <div className="flex flex-col min-w-0">
                  <p className="font-medium text-sm truncate">
                    {other?.full_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {getLastMessage(room)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatRoom
            room={selectedRoom}
            currentUser={currentUser}
            otherUser={getOtherUser(selectedRoom)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Pilih chat untuk memulai
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">Memuat pesan...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SideNav tetap dirender meskipun belum login */}
      <div className="sticky top-0 h-screen">
        <SideNav active="Chats" isOpen={isOpen} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* TopBar tetap dirender meskipun belum login */}
        <div className="sticky top-0 z-50 bg-white">
          <TopBar onToggleNav={() => setIsOpen(!isOpen)} />
        </div>

        {/* Gunakan 'relative' agar AuthGuardModal terkunci di area konten ini saja */}
        <main className="relative flex-1 flex flex-col overflow-hidden bg-white">
          {!isAuthenticated ? (
            <AuthGuardModal />
          ) : (
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center">
                  Loading chats...
                </div>
              }
            >
              <ChatContent />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}