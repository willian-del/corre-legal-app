import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

const maskPriceId = (priceId: string): string => {
  return `price_***${priceId.slice(-4)}`;
};

const maskId = (id: string, prefix: string = ''): string => {
  return `${prefix}***${id.slice(-4)}`;
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      throw new Error("Authentication required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Invalid authentication", { error: authError?.message });
      throw new Error("Invalid authentication");
    }
    
    logStep("User authenticated", { userId: user.id });

    // Input validation
    const VALID_PLANS = ['bronze', 'prata', 'ouro'] as const;
    type ValidPlan = typeof VALID_PLANS[number];

    const { plan_type } = await req.json();
    
    if (!plan_type || !VALID_PLANS.includes(plan_type as ValidPlan)) {
      logStep("ERROR: Invalid plan_type", { plan_type });
      throw new Error("Invalid plan type. Must be bronze, prata, or ouro");
    }
    
    logStep("Received valid plan_type", { plan_type });

    // Get price IDs from environment variables
    const priceIds = {
      bronze: Deno.env.get("STRIPE_PRICE_BRONZE"),
      prata: Deno.env.get("STRIPE_PRICE_PRATA"),
      ouro: Deno.env.get("STRIPE_PRICE_OURO")
    };

    const price_id = priceIds[plan_type as keyof typeof priceIds];
    if (!price_id) {
      logStep("ERROR: Price ID not found for plan", { plan_type });
      throw new Error(`Price ID not configured for plan: ${plan_type}`);
    }
    
    // Validate that it's a valid Stripe Price ID
    if (!price_id.startsWith('price_')) {
      logStep("ERROR: Invalid Price ID format", { plan_type, price_id: maskPriceId(price_id) });
      throw new Error(`INVALID_PRICE_ID: Configured value for ${plan_type} is not a valid Stripe Price ID (expected price_...)`);
    }
    
    logStep("Price ID found and validated", { plan_type, price_id: maskPriceId(price_id) });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia",
    });

    // Create checkout session for one-time payment (without authentication)
    // Determine a robust origin for redirect URLs
    const originHeader = req.headers.get("origin") || "";
    const refererHeader = req.headers.get("referer") || "";
    const envOrigin = Deno.env.get("ALLOWED_ORIGIN") || "";

    let origin = "";
    let originSource = "";
    
    if (/^https?:\/\//.test(originHeader)) {
      origin = originHeader;
      originSource = "Origin header";
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
        originSource = "Referer header";
      } catch (_) {
        // ignore URL parse error
      }
    }
    if (!origin && /^https?:\/\//.test(envOrigin)) {
      origin = envOrigin;
      originSource = "ALLOWED_ORIGIN env";
    }
    if (!origin) {
      throw new Error("No valid origin found. Set ALLOWED_ORIGIN with a full https URL.");
    }

    const base = origin.replace(/\/$/, "");
    logStep("Using redirect origin", { origin: base, source: originSource, plan_type });

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${base}/payment-success?session_id={CHECKOUT_SESSION_ID}&first_purchase=true`,
      cancel_url: `${base}/#pricing`,
      customer_creation: 'always',
    });

    logStep("Checkout session created", { sessionId: maskId(session.id, 'cs_'), url: '[REDACTED]' });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
