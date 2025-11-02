import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: maskEmail(user.email) });

    // Rate limiting: verificar última tentativa de checkout
    const { data: recentCheckouts } = await supabaseClient
      .from('user_subscriptions')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentCheckouts && recentCheckouts.length > 0) {
      const lastCheckoutTime = new Date(recentCheckouts[0].created_at).getTime();
      const now = Date.now();
      const cooldownPeriod = 60 * 1000; // 1 minuto
      
      if (now - lastCheckoutTime < cooldownPeriod) {
        logStep("Rate limit exceeded", { userId: user.id });
        throw new Error("Por favor, aguarde um momento antes de fazer outra solicitação");
      }
    }
    logStep("Rate limit check passed", { userId: user.id });

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
    logStep("Price ID found", { plan_type, price_id: maskPriceId(price_id) });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId: maskId(customerId, 'cus_') });
    } else {
      logStep("No existing customer found, will create on checkout");
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/#pricing`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
      },
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
