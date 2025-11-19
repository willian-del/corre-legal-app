import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema baseado na API do Mercado Pago
const PaymentDataSchema = z.object({
  paymentId: z.union([z.string(), z.number()]).transform(val => String(val)),
  status: z.string().min(1, "Status is required"),
  planType: z.enum(["monthly", "quarterly", "annual"]),
  amount: z.number().positive("Amount must be positive").optional(),
  couponCode: z.string().max(50).optional().nullable(),
  paymentMethod: z.string().max(50).optional(),
  paymentToken: z.string().max(500).optional().nullable(),
});

type PaymentData = z.infer<typeof PaymentDataSchema>;

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
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Parse and validate input
    const rawData = await req.json();
    const paymentData = PaymentDataSchema.parse(rawData);
    
    console.log("Processing payment:", { 
      userId: user.id, 
      paymentId: paymentData.paymentId,
      planType: paymentData.planType,
      amount: paymentData.amount 
    });

    // Check for duplicate payment
    const { data: existingPayment } = await supabaseClient
      .from("user_subscriptions")
      .select("id")
      .eq("mercadopago_payment_id", paymentData.paymentId)
      .maybeSingle();

    if (existingPayment) {
      console.log("Duplicate payment detected:", paymentData.paymentId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment already processed" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verify payment with Mercado Pago API
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    console.log("Fetching payment from Mercado Pago:", paymentData.paymentId);

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentData.paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago API error:", {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        body: errorText,
      });
      throw new Error(`Failed to verify payment with Mercado Pago: ${mpResponse.statusText}`);
    }

    const mpPayment = await mpResponse.json();
    
    // Log detalhado conforme documentação do MP
    console.log("Mercado Pago payment details:", {
      id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
      transaction_amount: mpPayment.transaction_amount,
      currency_id: mpPayment.currency_id,
      payment_method_id: mpPayment.payment_method_id,
      payment_type_id: mpPayment.payment_type_id,
      date_approved: mpPayment.date_approved,
      date_created: mpPayment.date_created,
    });

    // Verificar status do pagamento conforme documentação
    // Status possíveis: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back
    if (mpPayment.status !== "approved") {
      const statusMessages: Record<string, string> = {
        pending: "Pagamento pendente",
        in_process: "Pagamento em processamento",
        rejected: "Pagamento rejeitado",
        cancelled: "Pagamento cancelado",
        refunded: "Pagamento reembolsado",
        charged_back: "Pagamento com chargeback",
      };

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: statusMessages[mpPayment.status] || "Payment not approved",
          status: mpPayment.status,
          status_detail: mpPayment.status_detail,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validar valor do pagamento se fornecido
    if (paymentData.amount) {
      const amountDiff = Math.abs(mpPayment.transaction_amount - paymentData.amount);
      if (amountDiff > 0.01) {
        console.warn("Amount mismatch detected:", {
          expected: paymentData.amount,
          received: mpPayment.transaction_amount,
          difference: amountDiff,
        });
        
        // Usar o valor real do Mercado Pago
        console.log("Using Mercado Pago transaction amount as authoritative");
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

    // Create subscription record with all payment data from Mercado Pago
    const subscriptionData = {
      user_id: user.id,
      plan_type: paymentData.planType,
      status: "active",
      payment_method: mpPayment.payment_method_id || "mercadopago",
      amount_paid: mpPayment.transaction_amount,
      currency: mpPayment.currency_id || "BRL",
      expires_at: expiresAt.toISOString(),
      paid_at: mpPayment.date_approved || mpPayment.date_created || new Date().toISOString(),
      mercadopago_payment_id: String(mpPayment.id),
      payment_token: paymentData.paymentToken || null,
      coupon_code: paymentData.couponCode || null,
    };

    console.log("Creating subscription with data:", subscriptionData);

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("user_subscriptions")
      .insert(subscriptionData)
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
      }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid input data",
          details: error.errors 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
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
