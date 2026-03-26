import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Next.js Webhook handler for Xendit callbacks
export async function POST(request) {
  console.log("🔔 Webhook hit!")
  console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("SERVICE_KEY ada?:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log("CALLBACK_TOKEN ada?:", !!process.env.XENDIT_CALLBACK_TOKEN)
  
  try {
    const rawBody = await request.text();
    const xenditToken = request.headers.get("x-callback-token");

    console.log("📨 Webhook payload:", rawBody)
    console.log("🔑 Xendit token received:", xenditToken)

    // Verify Xendit Callback Token
    if (xenditToken !== process.env.XENDIT_CALLBACK_TOKEN) {
      console.warn("Invalid Xendit callback token received:", xenditToken);
      return NextResponse.json(
        { error: "Unauthorized callback" },
        { status: 401 },
      );
    }

    const payload = JSON.parse(rawBody);

    // We only care if the invoice was paid
    if (payload.status === "PAID") {
      const orderId = payload.external_id;

      console.log("✅ Invoice PAID! Order ID:", orderId)
      console.log("📦 Payload:", JSON.stringify(payload, null, 2))

      if (!orderId) {
        return NextResponse.json(
          { error: "Missing external_id" },
          { status: 400 },
        );
      }

      // We need a SERVICE ROLE Supabase client to bypass RLS since webhooks don't have user sessions
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceRoleKey) {
        console.error(
          "CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing! Webhook cannot bypass RLS to update orders.",
        );
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
          },
        },
      );

      // We update the order status
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .select();

      if (error) {
        console.error("Error updating order status:", error.message);
      } else if (!data || data.length === 0) {
        console.error(
          `Silent RLS Failure! 0 rows updated for order ${orderId}. Ensure SUPABASE_SERVICE_ROLE_KEY is perfectly correct in Vercel!`,
        );
      } else {
        console.log(`✨ Successfully updated order ${orderId} to in_progress status!`);
        console.log("📊 Updated data:", JSON.stringify(data, null, 2));
      }
    } else {
      console.log("ℹ️ Webhook received but status is not PAID. Status:", payload.status);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
