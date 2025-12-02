import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema - only accept valid plan types, no client-provided amounts
const PaymentRequestSchema = z.object({
  plan_type: z.enum(["quarterly"]),
  coupon_code: z.string().max(50).nullable().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated");
    }

    // Validate request body
    const body = await req.json();
    const validated = PaymentRequestSchema.parse(body);

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    console.log('AccessToken:', accessToken);
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Fetch authoritative price from database (using admin client for security)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: planData, error: planError } = await supabaseAdmin
      .from("plan_prices")
      .select("amount_cents, plan_type")
      .eq("plan_type", validated.plan_type)
      .eq("active", true)
      .maybeSingle();

    if (planError || !planData) {
      console.error("Error fetching plan price:", planError);
      throw new Error("Invalid plan type");
    }

    // Calculate final amount (convert cents to BRL)
    let finalAmount = planData.amount_cents / 100;

    // Validate and apply coupon server-side
    let couponApplied = null;
    if (validated.coupon_code) {
      // Load coupons from config (in production, fetch from database)
      const couponsConfig = {
        "PRIMEIRACOMPRA": { discountType: "percentage", discountValue: 15, active: true, validUntil: "2025-12-31" },
        "BEMVINDO10": { discountType: "fixed", discountValue: 10, active: true, validUntil: "2025-12-31" },
        "BLACK50": { discountType: "percentage", discountValue: 50, active: true, validUntil: "2025-11-30" },
        "NATAL20": { discountType: "percentage", discountValue: 20, active: true, validUntil: "2025-12-31" },
      };

      const coupon = couponsConfig[validated.coupon_code as keyof typeof couponsConfig];
      if (coupon && coupon.active && new Date(coupon.validUntil) >= new Date()) {
        couponApplied = validated.coupon_code;
        if (coupon.discountType === "percentage") {
          finalAmount = finalAmount * (1 - coupon.discountValue / 100);
        } else {
          finalAmount = Math.max(0, finalAmount - coupon.discountValue);
        }
      }
    }

    console.log("Server-calculated amount:", finalAmount, "BRL for plan:", validated.plan_type);

    // Create PIX payment with server-validated amount
    const paymentData = {
      transaction_amount: finalAmount,
      description: couponApplied
        ? `Corre Legal - Plano ${validated.plan_type} (Cupom: ${couponApplied})`
        : `Corre Legal - Plano ${validated.plan_type}`,
      payment_method_id: "pix",
      payer: {
        email: user.email,
      },
      external_reference: `${user.id}_${validated.plan_type}_${Date.now()}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      metadata: {
        user_id: user.id,
        plan_type: validated.plan_type,
        amount: finalAmount,
        coupon_code: couponApplied,
      },
    };

    console.log("Creating PIX payment:", paymentData);

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${user.id}_${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    
    if (!response.ok) {
      const error = await response.text();
      console.error("Mercado Pago API error:", error);
      throw new Error("Failed to create PIX payment");
    }

    const payment = await response.json();
    console.log("PIX payment created:", payment.id);

    // Extract PIX data
    const pixData = payment.point_of_interaction?.transaction_data;
    
    if (!pixData?.qr_code || !pixData?.qr_code_base64) {
      throw new Error("PIX data not available");
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        amount: payment.transaction_amount,
        expiration_date: payment.date_of_expiration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating PIX payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
