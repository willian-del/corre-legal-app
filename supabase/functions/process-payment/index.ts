import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentData {
  paymentId: string;
  status: string;
  planType: string;
  amount: number;
  couponCode?: string;
  paymentMethod: string;
}

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

    const paymentData: PaymentData = await req.json();
    console.log("Processing payment:", { userId: user.id, ...paymentData });

    // Verify payment was successful
    if (paymentData.status !== "approved") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment not approved" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
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

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_type: paymentData.planType,
        status: "active",
        payment_method: "mercadopago",
        amount_paid: paymentData.amount,
        currency: "BRL",
        expires_at: expiresAt.toISOString(),
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentData.paymentId, // Using this field for MP payment ID
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      throw new Error("Failed to create subscription");
    }

    console.log("Subscription created successfully:", subscription);

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          expiresAt: subscription.expires_at,
          planType: subscription.plan_type,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing payment:", error);
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
