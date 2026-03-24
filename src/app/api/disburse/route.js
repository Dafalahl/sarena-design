import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Pakai service role
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );

    // 1. Ambil data order
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    console.log("order:", order);
    console.log("orderError:", orderError);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found", detail: orderError },
        { status: 404 },
      );
    }

    console.log("creator_id:", order.creator_id);

    // 2. Ambil profile designer terpisah
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("disbursement_channel, disbursement_account, disbursement_name")
      .eq("id", order.creator_id)
      .single();

    console.log("profile:", profile);

    if (!profile?.disbursement_channel || !profile?.disbursement_account) {
      return NextResponse.json(
        { error: "Designer belum mengisi info pencairan" },
        { status: 400 },
      );
    }

    // 3. Hitung amount (potong fee 10%)
    const fee = Math.floor(order.amount * 0.1);
    const disbursementAmount = order.amount - fee;

    // 4. Kirim ke Xendit
    const xenditKey = process.env.XENDIT_SECRET_KEY;
    const authHeader = `Basic ${Buffer.from(xenditKey + ":").toString("base64")}`;

    const disbursementPayload = {
      external_id: `disburse-${orderId}`,
      bank_code: profile.disbursement_channel,
      account_holder_name: profile.disbursement_name,
      account_number: profile.disbursement_account,
      description: `Pencairan order Sarena: ${order.title}`,
      amount: disbursementAmount,
    };

    const xenditRes = await fetch("https://api.xendit.co/disbursements", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(disbursementPayload),
    });

    if (!xenditRes.ok) {
      const errData = await xenditRes.json();
      console.error("Xendit disbursement error:", errData);
      return NextResponse.json(
        { error: "Gagal disbursement" },
        { status: 500 },
      );
    }

    // 5. Update status order
    await serviceClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disburse route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
