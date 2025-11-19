import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    // Get request body
    const { plan_type, amount, coupon_code } = await req.json();

    // Get Mercado Pago access token
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Plan configuration - default titles
    const planTitles: Record<string, string> = {
      monthly: "Corre Legal - Plano Mensal",
      quarterly: "Corre Legal - Plano Trimestral",
      annual: "Corre Legal - Plano Anual",
    };

    // Use provided amount or fall back to default prices
    const defaultPrices: Record<string, number> = {
      monthly: 99.90,
      quarterly: 99.90,
      annual: 99.90,
    };

    const finalAmount = amount || defaultPrices[plan_type] || defaultPrices.monthly;
    const title = planTitles[plan_type] || planTitles.monthly;

    const item: PreferenceItem = {
      title: coupon_code ? `${title} (Cupom: ${coupon_code})` : title,
      quantity: 1,
      unit_price: finalAmount,
      currency_id: "BRL",
    };

    // Create preference
    const preference = {
      items: [item],
      payer: {
        email: user.email,
      },
      back_urls: {
        success: `${req.headers.get("origin")}/payment-success`,
        failure: `${req.headers.get("origin")}/checkout?plan=${plan_type}`,
        pending: `${req.headers.get("origin")}/payment-success`,
      },
      auto_return: "approved",
      statement_descriptor: "Corre Legal",
      external_reference: `${user.id}_${plan_type}_${Date.now()}`,
      metadata: {
        user_id: user.id,
        plan_type: plan_type,
        amount: finalAmount,
        coupon_code: coupon_code || null,
      },
    };

    // Call Mercado Pago API
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Mercado Pago API error:", error);
      throw new Error("Failed to create preference");
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        preference_id: data.id,
        init_point: data.init_point,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
