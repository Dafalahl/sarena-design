import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fungsi GET ini hanya bisa dipanggil oleh server Vercel
export async function GET(request) {
  try {
    // 1. Keamanan: Pastikan hanya Cron Vercel yang bisa menjalankan ini
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Gunakan SERVICE_ROLE_KEY agar bisa bypass RLS keamanan (karena ini sistem admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Wajib ditambahkan di env Vercel!
    );

    // 3. Hitung waktu 24 jam yang lalu
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 4. Cari semua order yang statusnya "delivered" dan sudah di-update lebih dari 24 jam lalu
    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "delivered")
      .lte("updated_at", yesterday); // lte = less than or equal (lebih tua dari kemarin)

    if (fetchError) throw fetchError;
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: "Tidak ada order yang expired hari ini." });
    }

    // 5. Looping order yang kadaluarsa untuk dicairkan
    const results = [];
    for (const order of expiredOrders) {
      // Ubah status ke completed
      await supabaseAdmin.from("orders").update({ status: "completed" }).eq("id", order.id);
      
      // PANGGIL LOGIKA XENDIT DISBURSE DI SINI
      // (Bisa gunakan fetch internal ke API disburse Anda, atau masukkan langsung logika Xendit-nya)
      // Contoh: await fetch('https://domain-kamu.com/api/disburse', { method: 'POST', body: JSON.stringify({ orderId: order.id }) });
      
      results.push(`Order ${order.id} otomatis dicairkan.`);
    }

    return NextResponse.json({ success: true, processed: results });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}