import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { plan_type, amount, coupon_code } = await req.json();

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Create PIX payment
    const paymentData = {
      transaction_amount: amount,
      description: coupon_code 
        ? `Corre Legal - Plano ${plan_type} (Cupom: ${coupon_code})`
        : `Corre Legal - Plano ${plan_type}`,
      payment_method_id: "pix",
      payer: {
        email: user.email,
      },
      external_reference: `${user.id}_${plan_type}_${Date.now()}`,
      metadata: {
        user_id: user.id,
        plan_type: plan_type,
        amount: amount,
        coupon_code: coupon_code || null,
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
