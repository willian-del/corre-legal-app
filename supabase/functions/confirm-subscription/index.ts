import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-SUBSCRIPTION] ${step}${detailsStr}`);
};

const requestSchema = z.object({
  session_id: z.string().min(1),
});

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;
    if (!user.email) {
      return new Response(JSON.stringify({ error: "Authenticated user has no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.json().catch(() => null);
    const parse = requestSchema.safeParse(body);
    if (!parse.success) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { session_id } = parse.data;
    logStep("Retrieving checkout session", { session_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Determine customer email with fallbacks
    let sessionEmail: string | null = (session.customer_email as string | null) ?? session.customer_details?.email ?? null;
    if (!sessionEmail && typeof session.customer === 'string') {
      try {
        const customerObj = await stripe.customers.retrieve(session.customer);
        const isDeleted = (customerObj as any).deleted === true;
        if (!isDeleted) {
          sessionEmail = (customerObj as Stripe.Customer).email ?? null;
        }
      } catch (_e) {
        // ignore
      }
    }

    if (!sessionEmail) {
      return new Response(JSON.stringify({ error: "Unable to determine customer email from session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (user.email.toLowerCase() !== sessionEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Session email does not match authenticated user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Determine plan via line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    const priceIds = {
      bronze: Deno.env.get("STRIPE_PRICE_BRONZE"),
      prata: Deno.env.get("STRIPE_PRICE_PRATA"),
      ouro: Deno.env.get("STRIPE_PRICE_OURO"),
    } as const;

    let planType: 'bronze' | 'prata' | 'ouro' = 'bronze';
    if (priceId === priceIds.ouro) planType = 'ouro';
    else if (priceId === priceIds.prata) planType = 'prata';
    else if (priceId === priceIds.bronze) planType = 'bronze';

    // Idempotency check
    const paymentIntent = session.payment_intent as string | null;
    if (paymentIntent) {
      const { data: existing } = await supabaseClient
        .from('user_subscriptions')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntent)
        .maybeSingle();

      if (existing) {
        logStep("Subscription already processed", { id: existing.id });
        return new Response(JSON.stringify({ ok: true, status: "already_processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Determine current period end (prefer Stripe subscription)
    let currentPeriodEndISO: string;
    let currentPeriodStartISO: string = new Date().toISOString();

    if (typeof session.subscription === 'string') {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        currentPeriodEndISO = new Date(sub.current_period_end * 1000).toISOString();
        currentPeriodStartISO = new Date(sub.current_period_start * 1000).toISOString();
      } catch (_e) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 6);
        currentPeriodEndISO = fallback.toISOString();
      }
    } else {
      const fallback = new Date();
      fallback.setMonth(fallback.getMonth() + 6);
      currentPeriodEndISO = fallback.toISOString();
    }

    const amountTotal = (session.amount_total ?? 0) / 100;

    const { error: insertError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_type: planType,
        status: 'active',
        stripe_customer_id: (session.customer as string) || null,
        stripe_subscription_id: (typeof session.subscription === 'string') ? session.subscription : null,
        stripe_payment_intent_id: paymentIntent || null,
        amount_paid: amountTotal.toString(),
        currency: (session.currency || 'BRL').toUpperCase(),
        payment_method: session.payment_method_types?.[0] || 'credit_card',
        paid_at: new Date().toISOString(),
        current_period_start: currentPeriodStartISO,
        current_period_end: currentPeriodEndISO,
        expires_at: currentPeriodEndISO,
      });

    if (insertError) {
      logStep("Error inserting subscription", { error: insertError });
      return new Response(JSON.stringify({ error: insertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Subscription confirmed successfully", { userId: user.id, planType });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
