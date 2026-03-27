"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateRoom } from "@/lib/chat";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import OrderDetailModal from "@/components/OrderDetailModal";
import DeliverModal from "@/components/DeliverModal";
import AuthGuardModal from "@/components/AuthGuardModal";

export default function YourWorkPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true = authenticated, false = not authenticated
  const [activeTab, setActiveTab] = useState("incoming");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const router = useRouter();

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

      // Fetch orders
      const fetchOrders = async () => {
        const statusMap = {
          incoming: "incoming",
          inprogress: "in_progress",
          completed: "completed",
        };

        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .eq("creator_id", authUser.id)
          .eq("status", statusMap[activeTab]);

        if (!ordersData) return;

        const ordersWithUsers = await Promise.all(
          ordersData.map(async (order) => {
            const { data: userData } = await supabase
              .from("users")
              .select("full_name, avatar_url")
              .eq("id", order.client_id)
              .single();
            return { ...order, users: userData };
          }),
        );

        setOrders(ordersWithUsers);
        setLoading(false);
      };

      await fetchOrders();
    };

    init();
  }, [activeTab]);

  const handleTerima = async (orderId) => {
    await supabase
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", orderId);
    setOrders(orders.filter((o) => o.id !== orderId));
  };

  const handleTolak = async (orderId) => {
    await supabase
      .from("orders")
      .update({ status: "rejected" })
      .eq("id", orderId);
    setOrders(orders.filter((o) => o.id !== orderId));
  };

  // Desainer adalah creator, jadi client_id = lawan bicara
  const handleGoToChat = async (order) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;
    await getOrCreateRoom(order.client_id, authUser.id);
    router.push(`/chats?designerId=${authUser.id}`);
  };

  const ChatButton = ({ order }) => (
    <button
      onClick={() => handleGoToChat(order)}
      className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-xl hover:bg-black/80 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );

  const tabs = [
    { key: "incoming", label: "In Coming" },
    { key: "inprogress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Your Work" isOpen={isNavOpen} />
      </div>
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-50 bg-white">
          <TopBar onToggleNav={() => setIsNavOpen(!isNavOpen)} />
        </div>

        <main className="p-8">
          <h1 className="text-2xl font-bold mb-6">Your Work</h1>

          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Order Cards */}
          {loading ? (
            <div>Loading...</div>
          ) : orders.length === 0 ? (
            <p className="text-gray-400 text-center mt-20">Tidak ada order.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#D9D9D9]/30 rounded-2xl px-6 py-4 flex items-center gap-4"
                >
                  <img
                    src={order.users?.avatar_url}
                    className="w-14 h-14 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <p className="font-semibold">{order.title}</p>
                    <p className="text-sm text-gray-500">
                      From {order.users?.full_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500">
                        Deadline:{" "}
                        {new Date(order.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {activeTab === "incoming" && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-full">
                          Menunggu Konfirmasi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol aksi */}
                  <div className="flex items-center gap-2">
                    {/* Incoming: Detail + Chat */}
                    {activeTab === "incoming" && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors text-sm font-medium"
                      >
                        Detail
                      </button>
                    )}

                    {/* In Progress: Kirim Hasil + Chat */}
                    {activeTab === "inprogress" && (
                      <button
                        onClick={() => setSelectedDelivery(order)}
                        className="px-4 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors text-sm font-medium"
                      >
                        Kirim Hasil
                      </button>
                    )}

                    {/* Tombol Chat — incoming & inprogress saja */}
                    {activeTab !== "completed" && <ChatButton order={order} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdate={() => {
              setSelectedOrder(null);
              setOrders(orders.filter((o) => o.id !== selectedOrder.id));
            }}
          />
        )}
        {selectedDelivery && (
          <DeliverModal
            order={selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
            onUpdate={() => {
              setSelectedDelivery(null);
              setOrders(orders.filter((o) => o.id !== selectedDelivery.id));
            }}
          />
        )}

        {/* Modal muncul kalau belum login */}
        {isAuthenticated === false && <AuthGuardModal />}
      </div>
    </div>
  );
}
