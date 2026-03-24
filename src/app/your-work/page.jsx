"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import OrderDetailModal from "@/components/OrderDetailModal";
import DeliverModal from "@/components/DeliverModal";

export default function YourWorkPage() {
  const [activeTab, setActiveTab] = useState("incoming");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

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

    fetchOrders();
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
        <div className="sticky top-0 z-30 bg-white">
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
                  {/* Avatar buyer */}
                  <img
                    src={order.users?.avatar_url}
                    className="w-14 h-14 rounded-full object-cover"
                  />

                  {/* Info */}
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

                  {/* Tombol Terima/Tolak */}
                  {activeTab === "incoming" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                      >
                        Detail
                      </button>
                    </div>
                  )}

                  {/* Tombol Kirim Hasil */}
                  {activeTab === "inprogress" && (
                    <button
                      onClick={() => setSelectedDelivery(order)}
                      className="px-4 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors text-sm"
                    >
                      Kirim Hasil
                    </button>
                  )}
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
      </div>
    </div>
  );
}
