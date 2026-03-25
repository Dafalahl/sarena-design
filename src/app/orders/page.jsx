"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [deliverable, setDeliverable] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const statusMap = {
        active: ["incoming", "negotiating", "in_progress", "delivered"],
        completed: ["completed"],
        rejected: ["rejected"],
      };

      // fetch orders dulu
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", authUser.id)
        .in("status", statusMap[activeTab]);

      if (!ordersData) return;

      // fetch user data untuk setiap order
      const ordersWithUsers = await Promise.all(
        ordersData.map(async (order) => {
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, avatar_url")
            .eq("id", order.creator_id)
            .single();

          // Fetch deliverable kalau status completed
          let deliverableUrl = null;
          if (order.status === "completed") {
            const { data: deliverableData } = await supabase
              .from("deliverables")
              .select("file_url")
              .eq("order_id", order.id)
              .single();
            deliverableUrl = deliverableData?.file_url ?? null;
          }

          return { ...order, creator: userData, deliverable_url: deliverableUrl };
        }),
      );

      setOrders(ordersWithUsers);
      setLoading(false);
    };

    fetchOrders();
  }, [activeTab]);

  const handleSetuju = async (order) => {
    // buyer setuju harga → in_progress
    await supabase
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", order.id);
    setOrders(orders.filter((o) => o.id !== order.id));
  };

  const handleTolakHarga = async (order) => {
    // buyer tolak harga → kembali ke incoming
    await supabase
      .from("orders")
      .update({ status: "incoming", amount: null })
      .eq("id", order.id);
    setOrders(orders.filter((o) => o.id !== order.id));
  };

  const handleBayar = async (order) => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url; // redirect ke Xendit
      } else {
        alert("Gagal membuat link pembayaran");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const handlePreview = async (order) => {
    try {
      const { data: deliverableData, error } = await supabase
        .from("deliverables")
        .select("*")
        .eq("order_id", order.id)
        .single();

      if (deliverableData) {
        setDeliverable(deliverableData);
        setPreviewOrder(order);
      } else {
        alert("Tidak ada hasil yang ditemukan");
      }
    } catch (error) {
      alert("Gagal memuat hasil");
    }
  };

  const handleApprove = async () => {
    try {
      const res = await fetch("/api/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: previewOrder.id }),
      });

      const data = await res.json();

      if (data.success) {
        setPreviewOrder(null);
        setDeliverable(null);
        setOrders(orders.filter((o) => o.id !== previewOrder.id));
        alert("Order selesai! Dana telah dikirim ke designer.");
      } else {
        alert("Gagal: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan");
    }
  };

  const statusLabel = {
    incoming: "Menunggu Konfirmasi Designer",
    negotiating: "Menunggu Persetujuan Harga",
    in_progress: "Sedang Dikerjakan",
    delivered: "Hasil Terkirim",
    completed: "Selesai",
    rejected: "Ditolak",
  };

  const statusColor = {
    incoming: "bg-yellow-100 text-yellow-700 border-yellow-300",
    negotiating: "bg-blue-100 text-blue-700 border-blue-300",
    in_progress: "bg-green-100 text-green-700 border-green-300",
    delivered: "bg-purple-100 text-purple-700 border-purple-300",
    completed: "bg-gray-100 text-gray-700 border-gray-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
  };

  const tabs = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 h-screen">
        <SideNav active="Orders" isOpen={isNavOpen} />
      </div>
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-30 bg-white">
          <TopBar onToggleNav={() => setIsNavOpen(!isNavOpen)} />
        </div>

        <main className="p-8">
          <h1 className="text-2xl font-bold mb-6">Orders</h1>

          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setLoading(true);
                }}
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
                  {/* Avatar designer */}
                  <img
                    src={order.creator?.avatar_url}
                    className="w-14 h-14 rounded-full object-cover"
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-semibold">{order.title}</p>
                    <p className="text-sm text-gray-500">
                      To {order.creator?.full_name}
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
                      <span
                        className={`text-xs border px-2 py-0.5 rounded-full ${statusColor[order.status]}`}
                      >
                        {statusLabel[order.status]}
                      </span>
                    </div>
                    {/* Tampilkan harga kalau negotiating */}
                    {order.status === "negotiating" && order.amount && (
                      <p className="text-sm font-semibold mt-1">
                        Harga: Rp {order.amount.toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>

                  {/* Tombol setuju/tolak harga */}
                  {order.status === "negotiating" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleBayar(order)}
                        className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
                      >
                        Bayar
                      </button>
                      <button
                        onClick={() => handleTolakHarga(order)}
                        className="px-6 py-2 border border-black/20 rounded-xl hover:bg-red-500 hover:text-white transition-colors font-medium"
                      >
                        Tolak
                      </button>
                    </div>
                  )}

                  {/* Tombol preview hasil */}
                  {order.status === "delivered" && (
                    <button
                      onClick={() => handlePreview(order)}
                      className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
                    >
                      Lihat Hasil
                    </button>
                  )}

                  {/* Tombol download kalau sudah completed */}
                  {order.status === "completed" && order.deliverable_url && (
                    <a
                      href={order.deliverable_url}
                      download
                      target="_blank"
                      className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Preview Deliverable Modal */}
        {previewOrder && deliverable && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setPreviewOrder(null)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div
                className="bg-[#F0F0F0] rounded-3xl w-full max-w-lg shadow-xl pointer-events-auto flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-8 pt-8 pb-4">
                  <h2 className="text-2xl font-bold">Hasil Desain</h2>
                </div>

                <hr className="border-black/10 mx-8" />

                <div className="px-8 py-6 flex flex-col gap-4">
                  <img
                    src={deliverable.file_url}
                    className="w-full rounded-xl object-contain max-h-64"
                  />
                  {deliverable.note && (
                    <div>
                      <p className="text-sm text-gray-500">
                        Catatan dari designer:
                      </p>
                      <p className="font-medium">{deliverable.note}</p>
                    </div>
                  )}
                </div>

                <hr className="border-black/10 mx-8" />

                <div className="flex items-center justify-between px-8 py-6">
                  <button
                    onClick={() => setPreviewOrder(null)}
                    className="px-6 py-2 border border-black/20 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
                  >
                    Approve ✓
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
