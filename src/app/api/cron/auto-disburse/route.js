import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    // LOGIKA DETEKTIF: Kita cek apa yang salah
    if (authHeader !== `Bearer ${expectedSecret}`) {
      // Print ke log server Vercel
      console.error("==== CRON AUTH ERROR ====");
      console.error("Yang diterima API (authHeader):", `"${authHeader}"`);
      console.error("Yang ada di Vercel (env)   :", `"${expectedSecret}"`);
      console.error("=========================");

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

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "delivered")
      .lte("updated_at", yesterday); 

    if (fetchError) throw fetchError;
    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({ message: "Tidak ada order yang expired hari ini." });
    }

    const results = [];
    for (const order of expiredOrders) {
      await supabaseAdmin.from("orders").update({ status: "completed" }).eq("id", order.id);
      results.push(`Order ${order.id} otomatis dicairkan.`);
    }

    return NextResponse.json({ success: true, processed: results });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}