import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema - only accept valid plan types, no client-provided amounts
const PreferenceRequestSchema = z.object({
  plan_type: z.enum(["quarterly"]),
  coupon_code: z.string().max(50).nullable().optional(),
});

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

    // Validate request body
    const body = await req.json();
    const validated = PreferenceRequestSchema.parse(body);

    // Get Mercado Pago access token
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
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

    // Plan configuration - default titles
    const planTitles: Record<string, string> = {
      quarterly: "Corre Legal - Plano Trimestral",
    };

    const title = planTitles[validated.plan_type];

    const item: PreferenceItem = {
      title: couponApplied ? `${title} (Cupom: ${couponApplied})` : title,
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
        failure: `${req.headers.get("origin")}/checkout?plan=${validated.plan_type}`,
        pending: `${req.headers.get("origin")}/payment-success`,
      },
      auto_return: "approved",
      statement_descriptor: "Corre Legal",
      external_reference: `${user.id}_${validated.plan_type}_${Date.now()}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      metadata: {
        user_id: user.id,
        plan_type: validated.plan_type,
        amount: finalAmount,
        coupon_code: couponApplied,
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
