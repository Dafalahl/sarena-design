"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ChatRoom({ room, currentUser, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    fetchOrders();

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => setMessages((prev) => [...prev, payload.new]),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, title, status")
      .or(`client_id.eq.${currentUser.id},creator_id.eq.${currentUser.id}`)
      .in("status", ["incoming", "negotiating", "in_progress", "delivered"]);
    setOrders(data || []);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await supabase.from("messages").insert({
      room_id: room.id,
      sender_id: currentUser.id,
      message_type: "text",
      content: input.trim(),
    });
    setInput("");
  };

  const handleSendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `chat/${room.id}/${Date.now()}_${file.name}`;
    await supabase.storage.from("chat-files").upload(filePath, file);
    const { data: urlData } = supabase.storage
      .from("chat-files")
      .getPublicUrl(filePath);

    await supabase.from("messages").insert({
      room_id: room.id,
      sender_id: currentUser.id,
      message_type: "file",
      metadata: {
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
      },
    });
  };

  const handleSendOrderRef = async (order) => {
    await supabase.from("messages").insert({
      room_id: room.id,
      sender_id: currentUser.id,
      message_type: "order_ref",
      metadata: {
        order_id: order.id,
        order_title: order.title,
        status: order.status,
      },
    });
    setShowOrderPicker(false);
  };

  const isMe = (msg) => msg.sender_id === currentUser.id;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/10 flex items-center gap-3 flex-shrink-0">
        <img
          src={otherUser?.avatar_url}
          className="w-9 h-9 rounded-full object-cover"
        />
        <p className="font-semibold">{otherUser?.full_name}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${isMe(msg) ? "justify-end" : "justify-start"}`}
          >
            {/* Teks biasa */}
            {msg.message_type === "text" && (
              <div
                className={`px-4 py-2 rounded-2xl max-w-xs text-sm ${isMe(msg) ? "bg-black text-white rounded-br-sm" : "bg-gray-100 text-black rounded-bl-sm"}`}
              >
                {msg.content}
              </div>
            )}

            {/* File */}
            {msg.message_type === "file" &&
              (msg.metadata.file_type?.startsWith("image/") ? (
                <img
                  src={msg.metadata.file_url}
                  className="rounded-2xl max-w-xs max-h-60 object-cover cursor-pointer"
                  onClick={() => window.open(msg.metadata.file_url, "_blank")}
                />
              ) : (
                <a
                  href={msg.metadata.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm border ${isMe(msg) ? "bg-black text-white border-black" : "bg-white border-black/20"}`}
                >
                  📎 {msg.metadata.file_name}
                </a>
              ))}

            {/* Order ref */}
            {msg.message_type === "order_ref" && (
              <div className="border border-black/20 rounded-2xl p-3 bg-white max-w-xs">
                <p className="text-xs text-gray-400 mb-1">Merujuk ke order</p>
                <p className="font-semibold text-sm">
                  {msg.metadata.order_title}
                </p>
                <span className="text-xs text-green-600">
                  {msg.metadata.status}
                </span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Order Picker */}
      {showOrderPicker && (
        <div className="mx-6 mb-2 border border-black/10 rounded-2xl overflow-hidden bg-white shadow-md flex-shrink-0">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">Tidak ada order aktif</p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSendOrderRef(order)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-black/5 last:border-0"
              >
                <p className="text-sm font-medium">{order.title}</p>
                <p className="text-xs text-gray-400">{order.status}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-black/10 flex items-center gap-2 flex-shrink-0">
        {/* Attach file */}
        <label className="cursor-pointer text-gray-400 hover:text-black transition-colors">
          📎
          <input type="file" className="hidden" onChange={handleSendFile} />
        </label>

        {/* Rujuk order */}
        <button
          onClick={() => setShowOrderPicker(!showOrderPicker)}
          className="text-gray-400 hover:text-black transition-colors text-sm"
        >
          📋
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Tulis pesan..."
          className="flex-1 border border-black/20 rounded-xl px-4 py-2 outline-none text-sm"
        />
        <button
          onClick={handleSend}
          className="px-5 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}
