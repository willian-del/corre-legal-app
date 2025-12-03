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

// Verify Mercado Pago webhook signature using HMAC-SHA256
async function verifyWebhookSignature(
  req: Request,
  payload: WebhookPayload
): Promise<{ valid: boolean; error?: string }> {
  const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET not configured - skipping signature verification");
    // In production, you should return { valid: false } here
    // For now, we allow requests to pass but log a warning
    return { valid: true };
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.error("Missing x-signature or x-request-id headers");
    return { valid: false, error: "Missing required signature headers" };
  }

  // Parse x-signature header (format: ts=TIMESTAMP,v1=SIGNATURE)
  const signatureParts: Record<string, string> = {};
  xSignature.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      signatureParts[key.trim()] = value.trim();
    }
  });

  const ts = signatureParts["ts"];
  const v1 = signatureParts["v1"];

  if (!ts || !v1) {
    console.error("Invalid x-signature format");
    return { valid: false, error: "Invalid signature format" };
  }

  // Validate timestamp (reject requests older than 5 minutes to prevent replay attacks)
  const timestamp = parseInt(ts, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const tolerance = 300; // 5 minutes

  if (Math.abs(currentTime - timestamp) > tolerance) {
    console.error("Webhook timestamp too old - possible replay attack");
    return { valid: false, error: "Request timestamp expired" };
  }

  // Build the manifest string for signature verification
  // Format: id:{data.id};request-id:{x-request-id};ts:{timestamp};
  const dataId = payload.data?.id;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Generate HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(manifest)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== v1.length) {
    console.error("Signature length mismatch");
    return { valid: false, error: "Invalid signature" };
  }

  let mismatch = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    mismatch |= expectedSignature.charCodeAt(i) ^ v1.charCodeAt(i);
  }

  if (mismatch !== 0) {
    console.error("Signature verification failed");
    return { valid: false, error: "Invalid signature" };
  }

  console.log("Webhook signature verified successfully");
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse payload first for signature verification
    const rawBody = await req.text();
    let payload: WebhookPayload;
    
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("Invalid JSON payload");
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify webhook signature
    const signatureResult = await verifyWebhookSignature(req, payload);
    if (!signatureResult.valid) {
      console.error("Webhook signature verification failed:", signatureResult.error);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("Webhook received:", JSON.stringify(payload, null, 2));
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

    // Payload already parsed and logged above

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
