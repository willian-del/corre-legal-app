import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Unauthorized - Admin access required');
    }

    // Parse request body
    const { period = '30d' } = await req.json();

    // Calculate date range
    let daysBack = 30;
    switch (period) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
    }

    // Fetch registrations by date
    const { data: registrations, error: regError } = await supabaseClient
      .from('profiles')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (regError) throw regError;

    // Fetch subscriptions by date
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('created_at, amount_paid')
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (subError) throw subError;

    // Aggregate data by date
    const dataMap = new Map();

    // Process registrations
    registrations?.forEach(reg => {
      const date = new Date(reg.created_at).toISOString().split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, { date, registrations: 0, subscriptions: 0, revenue: 0 });
      }
      const entry = dataMap.get(date);
      entry.registrations++;
    });

    // Process subscriptions
    subscriptions?.forEach(sub => {
      const date = new Date(sub.created_at).toISOString().split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, { date, registrations: 0, subscriptions: 0, revenue: 0 });
      }
      const entry = dataMap.get(date);
      entry.subscriptions++;
      entry.revenue += Number(sub.amount_paid || 0);
    });

    // Convert to array and sort by date
    const analytics = Array.from(dataMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate cumulative revenue
    let cumulativeRevenue = 0;
    analytics.forEach(entry => {
      cumulativeRevenue += entry.revenue;
      entry.cumulativeRevenue = cumulativeRevenue;
      entry.revenue = Number(entry.revenue.toFixed(2));
      entry.cumulativeRevenue = Number(cumulativeRevenue.toFixed(2));
    });

    console.log(`[ADMIN-ANALYTICS] Returning ${analytics.length} data points for period ${period}`);

    return new Response(
      JSON.stringify({ analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN-ANALYTICS] Error:', error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
