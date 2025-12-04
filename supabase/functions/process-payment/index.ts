import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema - ONLY quarterly plan allowed
const PaymentDataSchema = z.object({
  planType: z.enum(["quarterly"]),
  couponCode: z.string().max(50).optional().nullable(),
  paymentMethod: z.string().max(50),
});

type PaymentData = z.infer<typeof PaymentDataSchema>;

// Coupon configuration (same as create-mercadopago-preference)
const couponsConfig: Record<string, {
  discountType: "percentage" | "fixed";
  discountValue: number;
  active: boolean;
  validUntil: string;
}> = {
  "CORRE10": { discountType: "percentage", discountValue: 10, active: true, validUntil: "2025-12-31" },
  "AMIGO20": { discountType: "percentage", discountValue: 20, active: true, validUntil: "2025-12-31" },
  "PROMO15": { discountType: "fixed", discountValue: 15, active: true, validUntil: "2025-06-30" },
};

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
      console.error("[PROCESS-PAYMENT] Authentication error:", userError);
      throw new Error("User not authenticated");
    }

    // Parse and validate input
    const rawData = await req.json();
    const paymentData = PaymentDataSchema.parse(rawData);
    const paymentDataMP = rawData.paymentData;

    console.log("[PROCESS-PAYMENT] Processing payment for user:", user.id);
    console.log("[PROCESS-PAYMENT] Plan type:", paymentData.planType);
    console.log("[PROCESS-PAYMENT] Coupon code:", paymentData.couponCode);

    // SERVER-SIDE PRICE CALCULATION - Never trust client amount
    const { data: planData, error: planError } = await supabaseAdmin
      .from("plan_prices")
      .select("amount_cents")
      .eq("plan_type", paymentData.planType)
      .eq("active", true)
      .maybeSingle();

    if (planError || !planData) {
      console.error("[PROCESS-PAYMENT] Error fetching plan price:", planError);
      throw new Error("Invalid plan type or plan not found");
    }

    let finalAmount = planData.amount_cents / 100; // Convert cents to BRL
    console.log("[PROCESS-PAYMENT] Base plan price:", finalAmount);

    // Apply coupon discount server-side
    if (paymentData.couponCode) {
      const coupon = couponsConfig[paymentData.couponCode];
      if (coupon && coupon.active && new Date(coupon.validUntil) >= new Date()) {
        if (coupon.discountType === "percentage") {
          const discount = (finalAmount * coupon.discountValue) / 100;
          finalAmount = finalAmount - discount;
          console.log("[PROCESS-PAYMENT] Applied percentage discount:", coupon.discountValue, "%, new amount:", finalAmount);
        } else {
          finalAmount = Math.max(0, finalAmount - coupon.discountValue);
          console.log("[PROCESS-PAYMENT] Applied fixed discount:", coupon.discountValue, ", new amount:", finalAmount);
        }
      } else {
        console.warn("[PROCESS-PAYMENT] Invalid or expired coupon:", paymentData.couponCode);
      }
    }

    // Verify payment with Mercado Pago API
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!accessToken) {
      console.error("[PROCESS-PAYMENT] MERCADOPAGO_ACCESS_TOKEN not configured");
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
      transaction_amount: finalAmount, // USE SERVER-CALCULATED AMOUNT
    };

    console.log("[PROCESS-PAYMENT] Sending to Mercado Pago:", {
      email: mpData.payer.email,
      amount: mpData.transaction_amount,
      installments: mpData.installments,
    });

    const idempotencyKey = crypto.randomUUID();
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[PROCESS-PAYMENT] Mercado Pago API error:", errorText);
      throw new Error("Failed to process payment with Mercado Pago");
    }

    const mpPayment = await mpResponse.json();

    console.log("[PROCESS-PAYMENT] Mercado Pago response:", {
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

    // Verify payment status
    if (mpPayment.status !== "approved") {
      const statusDetail = mpPayment.status_detail || "unknown";
      const userMessage = errorMessages[statusDetail] || 
        "Pagamento não aprovado. Entre em contato com seu banco para mais informações.";
      
      console.error("[PROCESS-PAYMENT] Payment rejected:", {
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
          status: 200,
        },
      );
    }

    // Calculate subscription expiration (quarterly = 3 months)
    const now = new Date();
    const expiresAt = new Date(now.setMonth(now.getMonth() + 3));

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
      console.error("[PROCESS-PAYMENT] Error creating subscription:", subscriptionError);
      throw new Error("Failed to create subscription");
    }

    console.log("[PROCESS-PAYMENT] Subscription created successfully:", {
      id: subscription.id,
      userId: user.id,
      planType: subscription.plan_type,
      amountPaid: subscription.amount_paid,
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
    console.error("[PROCESS-PAYMENT] Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Dados de pagamento inválidos",
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
