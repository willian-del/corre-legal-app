import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EXPIRING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting expiration check");

    const now = new Date();
    let processedCount = 0;

    // Check for subscriptions expiring in 30 days
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiring30Days, error: error30 } = await supabaseClient
      .from('user_subscriptions')
      .update({ alert_30_days_sent: true })
      .eq('status', 'active')
      .eq('alert_30_days_sent', false)
      .lte('expires_at', thirtyDaysFromNow.toISOString())
      .gt('expires_at', now.toISOString())
      .select();

    if (error30) throw error30;
    processedCount += expiring30Days?.length || 0;
    logStep("Marked 30-day alerts", { count: expiring30Days?.length || 0 });

    // Check for subscriptions expiring in 15 days
    const fifteenDaysFromNow = new Date(now);
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    const { data: expiring15Days, error: error15 } = await supabaseClient
      .from('user_subscriptions')
      .update({ alert_15_days_sent: true })
      .eq('status', 'active')
      .eq('alert_15_days_sent', false)
      .lte('expires_at', fifteenDaysFromNow.toISOString())
      .gt('expires_at', now.toISOString())
      .select();

    if (error15) throw error15;
    processedCount += expiring15Days?.length || 0;
    logStep("Marked 15-day alerts", { count: expiring15Days?.length || 0 });

    // Check for subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiring7Days, error: error7 } = await supabaseClient
      .from('user_subscriptions')
      .update({ alert_7_days_sent: true })
      .eq('status', 'active')
      .eq('alert_7_days_sent', false)
      .lte('expires_at', sevenDaysFromNow.toISOString())
      .gt('expires_at', now.toISOString())
      .select();

    if (error7) throw error7;
    processedCount += expiring7Days?.length || 0;
    logStep("Marked 7-day alerts", { count: expiring7Days?.length || 0 });

    // Mark expired subscriptions
    const { data: expired, error: errorExpired } = await supabaseClient
      .from('user_subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lte('expires_at', now.toISOString())
      .select();

    if (errorExpired) throw errorExpired;
    processedCount += expired?.length || 0;
    logStep("Marked expired subscriptions", { count: expired?.length || 0 });

    logStep("Expiration check completed", { totalProcessed: processedCount });

    return new Response(JSON.stringify({ 
      success: true, 
      processedCount,
      details: {
        alert30Days: expiring30Days?.length || 0,
        alert15Days: expiring15Days?.length || 0,
        alert7Days: expiring7Days?.length || 0,
        expired: expired?.length || 0,
      }
    }), {
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
