import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const payload: WebhookPayload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Processar apenas eventos de pagamento
    if (payload.type !== "payment") {
      console.log("Ignoring non-payment event:", payload.type);
      return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    console.log(accessToken);
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payload.data.id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment details: ${paymentResponse.status}`);
    }

    const paymentData = await paymentResponse.json();
    console.log("Payment data:", JSON.stringify(paymentData, null, 2));

    // Extrair user_id e plan_type dos metadados
    const userId = paymentData.metadata?.user_id;
    const planType = paymentData.metadata?.plan_type;
    const amount = paymentData.metadata?.amount;
    const couponCode = paymentData.metadata?.coupon_code;

    if (!userId || !planType) {
      console.error("Missing user_id or plan_type in payment metadata");
      return new Response(JSON.stringify({ success: false, error: "Missing metadata" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Mapear status do Mercado Pago para status da assinatura
    let subscriptionStatus: string;
    let paidAt: string | null = null;
    let expiresAt: string | null = null;

    switch (paymentData.status) {
      case "approved":
        subscriptionStatus = "active";
        paidAt = new Date().toISOString();

        // Calcular data de expiração baseado no plano
        const expirationDate = new Date();
        if (planType === "monthly") {
          expirationDate.setMonth(expirationDate.getMonth() + 1);
        } else if (planType === "quarterly") {
          expirationDate.setMonth(expirationDate.getMonth() + 3);
        } else if (planType === "annual") {
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        }
        expiresAt = expirationDate.toISOString();
        break;

      case "pending":
      case "in_process":
        subscriptionStatus = "pending";
        break;

      case "rejected":
      case "cancelled":
        subscriptionStatus = "cancelled";
        break;

      case "refunded":
      case "charged_back":
        subscriptionStatus = "refunded";
        break;

      default:
        subscriptionStatus = "pending";
    }

    // Implementar idempotência: verificar se o pagamento já foi processado
    const { data: existingSubscription } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("mercadopago_payment_id", paymentData.id.toString())
      .single();

    if (existingSubscription) {
      // Se já existe e o status é o mesmo, retornar sucesso (idempotência)
      if (existingSubscription.status === subscriptionStatus) {
        console.log("Payment already processed (idempotent):", paymentData.id);
        return new Response(
          JSON.stringify({
            success: true,
            status: subscriptionStatus,
            payment_id: paymentData.id,
            idempotent: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      // Atualizar assinatura existente apenas se o status mudou
      const { error: updateError } = await supabaseAdmin
        .from("user_subscriptions")
        .update({
          status: subscriptionStatus,
          paid_at: paidAt || existingSubscription.paid_at,
          expires_at: expiresAt || existingSubscription.expires_at,
          payment_method: paymentData.payment_method_id || existingSubscription.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq("mercadopago_payment_id", paymentData.id.toString());

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        throw updateError;
      }

      console.log("Subscription updated:", existingSubscription.id);
    } else {
      // Criar nova assinatura se for aprovada
      if (subscriptionStatus === "active") {
        const { error: insertError } = await supabaseAdmin.from("user_subscriptions").insert({
          user_id: userId,
          plan_type: planType,
          status: subscriptionStatus,
          payment_method: paymentData.payment_method_id || "mercadopago",
          amount_paid: amount || paymentData.transaction_amount,
          currency: paymentData.currency_id || "BRL",
          paid_at: paidAt,
          expires_at: expiresAt,
          mercadopago_payment_id: paymentData.id.toString(),
          coupon_code: couponCode,
        });

        if (insertError) {
          console.error("Error creating subscription:", insertError);
          throw insertError;
        }

        console.log("New subscription created for user:", userId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: subscriptionStatus,
        payment_id: paymentData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
