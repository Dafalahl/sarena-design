"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { goToChat } from "@/lib/chat";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";
import AuthGuardModal from "@/components/AuthGuardModal";
import PreviewModal from "@/components/PreviewModal"; // <-- Import komponen modal baru

export default function OrdersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading, true = authenticated, false = not authenticated
  const [activeTab, setActiveTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [deliverable, setDeliverable] = useState(null);
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
          active: ["incoming", "negotiating", "in_progress", "delivered"],
          completed: ["completed"],
          rejected: ["rejected"],
        };

        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .eq("client_id", authUser.id)
          .in("status", statusMap[activeTab]);

        if (!ordersData) return;

        const ordersWithUsers = await Promise.all(
          ordersData.map(async (order) => {
            const { data: userData } = await supabase
              .from("users")
              .select("full_name, avatar_url")
              .eq("id", order.creator_id)
              .single();

            let deliverableUrl = null;
            let originalDownloadUrl = null; // State baru
            let originalFileName = null; // State baru

            if (order.status === "completed") {
              const { data: deliverableData } = await supabase
                .from("deliverables")
                .select("*") // Ubah select(*) agar dapat semua kolom
                .eq("order_id", order.id)
                .single();
              
              if(deliverableData){
                deliverableUrl = deliverableData.file_url;
                originalFileName = deliverableData.original_file_name;

                // TIKET KEAMANAN DITERBITKAN: 
                // Buat link privat berjangka waktu (signed URL) selama 15 menit (900 detik)
                if(deliverableData.original_file_url) {
                  const { data: signedData, error: signedError } = await supabase.storage
                    .from("original-deliverables") // Bucket privat
                    .createSignedUrl(deliverableData.original_file_url, 900); // Valid 15 menit

                  if(signedData){
                    originalDownloadUrl = signedData.signedUrl;
                  }
                }
              }
            }

            return {
              ...order,
              creator: userData,
              deliverable_url: deliverableUrl,
              secure_download_url: originalDownloadUrl, // Simpan signed URL rahasia
              original_file_name: originalFileName, // Simpan nama file rahasia
            };
          }),
        );

        setOrders(ordersWithUsers);
        setLoading(false);
      };

      await fetchOrders();
    };

    init();
  }, [activeTab]);

  const handleSetuju = async (order) => {
    await supabase
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", order.id);
    setOrders(orders.filter((o) => o.id !== order.id));
  };

  const handleTolakHarga = async (order) => {
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
        window.location.href = data.checkout_url;
      } else {
        alert("Gagal membuat link pembayaran");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const handlePreview = async (order) => {
    try {
      const { data: deliverableData } = await supabase
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

  const handleGoToChat = async (order) => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      await goToChat(router, authUser.id, order.creator_id);
    } catch (error) {
      console.error(error);
      alert("Gagal membuka chat");
    }
  };

  // Fungsi khusus untuk menutup modal (mereset state)
  const handleCloseModal = () => {
    setPreviewOrder(null);
    setDeliverable(null);
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

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* SideNav tetap muncul */}
      <div className="sticky top-0 h-screen">
        <SideNav active="Orders" isOpen={isNavOpen} />
      </div>

      <div className="flex flex-col flex-1">
        {/* TopBar tetap muncul */}
        <div className="sticky top-0 z-50 bg-white">
          <TopBar onToggleNav={() => setIsNavOpen(!isNavOpen)} />
        </div>

        {/* Wajib 'relative' agar AuthGuardModal mengunci di sini */}
        <main className="relative flex-1 p-8 bg-white">
          {isAuthenticated === false ? (
            <AuthGuardModal />
          ) : (
            <>
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
                <p className="text-gray-400 text-center mt-20">
                  Tidak ada order.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-[#D9D9D9]/30 rounded-2xl px-6 py-4 flex items-center gap-4"
                    >
                      <img
                        src={order.creator?.avatar_url}
                        className="w-14 h-14 rounded-full object-cover"
                        alt="avatar"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{order.title}</p>
                        <p className="text-sm text-gray-500">
                          To {order.creator?.full_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-gray-500">
                            Deadline:{" "}
                            {new Date(order.deadline).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                          <span
                            className={`text-xs border px-2 py-0.5 rounded-full ${statusColor[order.status]}`}
                          >
                            {statusLabel[order.status]}
                          </span>
                        </div>
                        {order.status === "negotiating" && order.amount && (
                          <p className="text-sm font-semibold mt-1">
                            Harga: Rp {order.amount.toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === "negotiating" && (
                          <>
                            <button
                              onClick={() => handleBayar(order)}
                              className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
                            >
                              Bayar
                            </button>
                            <button
                              onClick={() => handleTolakHarga(order)}
                              className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        {order.status === "delivered" && (
                          <button
                            onClick={() => handlePreview(order)}
                            className="px-6 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors font-medium"
                          >
                            Lihat Hasil
                          </button>
                        )}

                      {order.status === "completed" &&
                        order.secure_download_url && ( // <--- Ganti dengan signed URL
                          <a
                            href={order.secure_download_url} // <--- Link rahasia berjangka waktu
                            download={order.original_file_name} // Kasih nama file asli
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm flex items-center gap-2"
                          >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download File Asli
                          </a>
                        )}

                        {order.status !== "rejected" && (
                          <button
                            onClick={() => handleGoToChat(order)}
                            className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-xl hover:bg-black/80 transition-colors ml-auto"
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
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 2. Panggil PreviewModal di sini */}
      <PreviewModal 
        order={previewOrder}
        deliverable={deliverable}
        onClose={handleCloseModal}
        onApprove={handleApprove}
      />
      
    </div>
  );
}