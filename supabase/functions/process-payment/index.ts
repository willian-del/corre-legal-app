import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const PaymentDataSchema = z.object({
  status: z.string().min(1, "Status is required").max(50),
  planType: z.enum(["monthly", "quarterly", "annual"]),
  amount: z.number().positive("Amount must be positive").max(999999).optional(),
  couponCode: z.string().max(50).optional(),
  paymentMethod: z.string().max(50),
});

type PaymentData = z.infer<typeof PaymentDataSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Parse and validate input
    const rawData = await req.json();
    const paymentData = PaymentDataSchema.parse(rawData);
    const paymentDataMP = rawData.paymentData;

    console.log("Processing payment:", {
      userId: user.id,
      planType: paymentData.planType,
      amount: paymentData.amount,
      datMP: paymentDataMP,
    });

    // Verify payment with Mercado Pago API
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    const mpData = {
      payer: {
        email: paymentDataMP.formData.payer.email,
        identification: paymentDataMP.formData.identification,
      },
      binary_mode: true,
      installments: paymentDataMP.formData.installments,
      token: paymentDataMP.formData.token,
      transaction_amount: paymentData.amount,
    };

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(mpData),
    });

    console.log(mpResponse);

    if (!mpResponse.ok) {
      console.error("Mercado Pago API error:", await mpResponse.text());
      throw new Error("Failed to verify payment with Mercado Pago");
    }

    const mpPayment = await mpResponse.json();

    console.log("Mercado Pago payment verified:", {
      id: mpPayment.id,
      status: mpPayment.status,
      amount: mpPayment.transaction_amount,
    });

    // Verify payment status and amount
    if (mpPayment.status !== "approved") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not approved by Mercado Pago",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Optional: Log amount if provided for comparison
    if (paymentData.amount) {
      const amountDiff = Math.abs(mpPayment.transaction_amount - paymentData.amount);
      if (amountDiff > 0.01) {
        console.warn("Amount mismatch (informational):", {
          expected: paymentData.amount,
          received: mpPayment.transaction_amount,
        });
      }
    }

    // Calculate subscription expiration based on plan type
    const now = new Date();
    let expiresAt: Date;

    switch (paymentData.planType) {
      case "monthly":
        expiresAt = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case "quarterly":
        expiresAt = new Date(now.setMonth(now.getMonth() + 3));
        break;
      case "annual":
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      default:
        expiresAt = new Date(now.setMonth(now.getMonth() + 1));
    }

    // Create subscription record with all payment data
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_type: paymentData.planType,
        status: "active",
        payment_method: "mercadopago",
        amount_paid: mpPayment.transaction_amount,
        currency: mpPayment.currency_id || "BRL",
        expires_at: expiresAt.toISOString(),
        paid_at: new Date().toISOString(),
        mercadopago_payment_id: paymentData.paymentId,
        payment_token: paymentData.paymentToken,
        coupon_code: paymentData.couponCode,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      throw new Error("Failed to create subscription");
    }

    console.log("Subscription created successfully:", {
      id: subscription.id,
      userId: user.id,
      planType: subscription.plan_type,
      expiresAt: subscription.expires_at,
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          expiresAt: subscription.expires_at,
          planType: subscription.plan_type,
          amountPaid: subscription.amount_paid,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error processing payment:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input data",
          details: error.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
