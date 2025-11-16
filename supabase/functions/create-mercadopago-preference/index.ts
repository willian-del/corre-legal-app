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
    const { plan_type } = await req.json();

    // Get Mercado Pago access token
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    // Plan configuration
    const plans: Record<string, PreferenceItem> = {
      monthly: {
        title: "Corre Legal - Plano Mensal",
        quantity: 1,
        unit_price: 39.90,
        currency_id: "BRL",
      },
      quarterly: {
        title: "Corre Legal - Plano Trimestral",
        quantity: 1,
        unit_price: 99.90,
        currency_id: "BRL",
      },
      annual: {
        title: "Corre Legal - Plano Anual",
        quantity: 1,
        unit_price: 349.90,
        currency_id: "BRL",
      },
    };

    const item = plans[plan_type] || plans.monthly;

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
