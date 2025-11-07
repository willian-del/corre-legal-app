import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !adminUser) throw new Error('Not authenticated');

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabaseClient.rpc('is_admin', {
      _user_id: adminUser.id
    });

    if (adminError || !isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, userId, subscriptionId, planType, daysToExtend, amountPaid } = await req.json();

    console.log('[ADMIN-MANAGE-SUBSCRIPTION] Admin:', adminUser.id, 'Operation:', operation);

    let result;
    let auditDetails;

    if (operation === 'create-manual') {
      // Create manual/cortesia subscription
      if (!userId || !planType) {
        throw new Error('userId and planType are required for create-manual');
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days by default

      const { data, error } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          amount_paid: amountPaid || 0,
          currency: 'BRL',
          payment_method: 'cortesia',
          current_period_start: new Date().toISOString(),
          current_period_end: expiresAt.toISOString(),
          paid_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      result = data;
      auditDetails = { operation: 'create-manual', planType, expiresAt, amountPaid };

    } else if (operation === 'extend') {
      // Extend subscription period
      if (!subscriptionId || !daysToExtend) {
        throw new Error('subscriptionId and daysToExtend are required for extend');
      }

      // Get current subscription
      const { data: currentSub, error: fetchError } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new expiration
      const currentExpires = new Date(currentSub.expires_at);
      const now = new Date();
      const baseDate = currentExpires > now ? currentExpires : now;
      const newExpires = new Date(baseDate);
      newExpires.setDate(newExpires.getDate() + daysToExtend);

      // Update subscription
      const { data, error } = await supabaseClient
        .from('user_subscriptions')
        .update({
          expires_at: newExpires.toISOString(),
          current_period_end: newExpires.toISOString(),
          status: 'active' // Reactivate if expired
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      result = data;
      auditDetails = { operation: 'extend', daysToExtend, oldExpires: currentSub.expires_at, newExpires };

    } else if (operation === 'cancel') {
      // Cancel subscription
      if (!subscriptionId) {
        throw new Error('subscriptionId is required for cancel');
      }

      const { data, error } = await supabaseClient
        .from('user_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      result = data;
      auditDetails = { operation: 'cancel', subscriptionId };

    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    // Log audit trail
    await supabaseClient.from('admin_audit_logs').insert({
      admin_user_id: adminUser.id,
      action: `subscription_${operation}`,
      target_user_id: userId || result.user_id,
      target_type: 'subscription',
      target_id: result.id,
      details: auditDetails,
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent')
    });

    console.log('[ADMIN-MANAGE-SUBSCRIPTION] Success:', operation, 'for subscription:', result.id);

    return new Response(
      JSON.stringify({ success: true, subscription: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN-MANAGE-SUBSCRIPTION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
