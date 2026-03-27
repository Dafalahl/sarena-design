import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        alasan: 'Kata sandi tidak cocok.',
        yangDiterima: authHeader ? authHeader : "KOSONG / TIDAK ADA HEADER",
      }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY 
    );

    // Hitung waktu (Gunakan 24 jam untuk Production, atau 5 Menit untuk Uji Coba)
    const yesterday = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "delivered")
      .lte("updated_at", yesterday); 

    if (fetchError) throw fetchError;
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: "Tidak ada order yang expired hari ini." });
    }

    // --- BAGIAN YANG DIPERBAIKI ---
    // Dapatkan Base URL (Domain Vercel atau Localhost) untuk memanggil API lain
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host");
    const baseUrl = `${protocol}://${host}`;

    const results = [];
    
    for (const order of expiredOrders) {
      // Jangan update database manual di sini.
      // Panggil API Disburse Anda yang akan mengurus Xendit + Update Database!
      try {
        const disburseReq = await fetch(`${baseUrl}/api/disburse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        const disburseData = await disburseReq.json();

        if (disburseReq.ok && disburseData.success) {
          results.push(`Order ${order.id} sukses dicairkan via Xendit.`);
        } else {
          results.push(`Order ${order.id} GAGAL dicairkan Xendit: ${disburseData.error}`);
        }
      } catch (err) {
        results.push(`Order ${order.id} GAGAL dipanggil: ${err.message}`);
      }
    }
    // --- AKHIR BAGIAN YANG DIPERBAIKI ---

    return NextResponse.json({ success: true, processed: results });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}