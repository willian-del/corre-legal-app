import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const PaymentDataSchema = z.object({
  planType: z.enum(["monthly", "quarterly", "annual"]),
  amount: z.number().positive("Amount must be positive").max(999999).optional(),
  couponCode: z.string().max(50).optional().nullable(),
  paymentMethod: z.string().max(50),
});

type PaymentData = z.infer<typeof PaymentDataSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for database operations (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user with anon key
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
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
        identification: paymentDataMP.formData.payer.identification,
      },
      binary_mode: true,
      installments: paymentDataMP.formData.installments,
      token: paymentDataMP.formData.token,
      transaction_amount: paymentData.amount,
    };

    console.log("Processing MP:", mpData);

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
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
      status_detail: mpPayment.status_detail,
      amount: mpPayment.transaction_amount,
    });

    // Map Mercado Pago error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      "cc_rejected_insufficient_amount": "Saldo insuficiente no cartão",
      "cc_rejected_bad_filled_security_code": "Código de segurança inválido",
      "cc_rejected_bad_filled_date": "Data de validade inválida",
      "cc_rejected_bad_filled_card_number": "Número do cartão inválido",
      "cc_rejected_call_for_authorize": "Cartão requer autorização - entre em contato com seu banco",
      "cc_rejected_duplicated_payment": "Pagamento duplicado detectado",
      "cc_rejected_max_attempts": "Número máximo de tentativas excedido",
      "cc_rejected_high_risk": "Pagamento recusado por segurança",
      "cc_amount_rate_limit_exceeded": "Limite de transações excedido - aguarde alguns minutos e tente novamente",
      "cc_rejected_other_reason": "Pagamento não autorizado pelo banco",
    };

    // Verify payment status and amount
    if (mpPayment.status !== "approved") {
      const statusDetail = mpPayment.status_detail || "unknown";
      const userMessage = errorMessages[statusDetail] || 
        "Pagamento não aprovado. Entre em contato com seu banco para mais informações.";
      
      console.error("Payment rejected:", {
        status: mpPayment.status,
        status_detail: statusDetail,
        payment_id: mpPayment.id,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage,
          details: {
            status: mpPayment.status,
            status_detail: statusDetail,
            payment_id: mpPayment.id,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Changed to 200 so Supabase client doesn't treat as error
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

    // Create subscription record with all payment data using admin client
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
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
        mercadopago_payment_id: String(mpPayment.id),
        payment_token: String(mpPayment.id),
        coupon_code: paymentData.couponCode || null,
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
          scheme: PaymentDataSchema,
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
