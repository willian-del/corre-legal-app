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

    // Fetch auth users for DAU/MAU calculation
    const { data: authData, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      console.error('[ADMIN-ANALYTICS] Warning: Could not fetch auth users', authError);
    }

    const authUsers = authData?.users || [];

    // Calculate DAU and MAU per day
    const activityByDate = new Map();
    
    // Process each day in the period
    for (let i = 0; i < daysBack; i++) {
      const currentDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      activityByDate.set(dateStr, {
        dau: new Set(),
        mau: new Set()
      });
      
      authUsers.forEach(user => {
        if (!user.last_sign_in_at) return;
        
        const lastSignIn = new Date(user.last_sign_in_at);
        
        // Normalize dates to compare only days (remove time component)
        const currentDateOnly = new Date(currentDate);
        currentDateOnly.setHours(0, 0, 0, 0);
        
        const lastSignInOnly = new Date(lastSignIn);
        lastSignInOnly.setHours(0, 0, 0, 0);
        
        // Calculate days difference (positive means login is in the past)
        const daysDiff = Math.floor((currentDateOnly.getTime() - lastSignInOnly.getTime()) / (1000 * 60 * 60 * 24));
        
        // DAU: user logged in exactly on this day
        if (daysDiff === 0) {
          activityByDate.get(dateStr)?.dau.add(user.id);
        }
        
        // MAU: user logged in within last 30 days (including today)
        if (daysDiff >= 0 && daysDiff <= 30) {
          activityByDate.get(dateStr)?.mau.add(user.id);
        }
      });
    }

    // Build complete date range list for the selected period (oldest -> newest)
    const dates = [] as string[];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Aggregate data by date - initialize map with all dates set to zero values
    const dataMap = new Map();
    dates.forEach(date => {
      dataMap.set(date, { date, registrations: 0, subscriptions: 0, revenue: 0 });
    });

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

    // Calculate cumulative values while building analytics array chronologically
    let cumulativeRevenue = 0;
    let cumulativeRegistrations = 0;
    let cumulativeSubscriptions = 0;

    const analytics = dates.map(date => {
      const base = dataMap.get(date);

      // Accumulate
      cumulativeRegistrations += base.registrations;
      cumulativeSubscriptions += base.subscriptions;
      cumulativeRevenue += base.revenue;

      // Add activity metrics
      const activity = activityByDate.get(date);
      const dau = activity?.dau.size || 0;
      const mau = activity?.mau.size || 0;
      const stickiness = mau > 0 ? Number(((dau / mau) * 100).toFixed(2)) : 0;

      return {
        ...base,
        revenue: Number(base.revenue.toFixed(2)),
        cumulativeRegistrations,
        cumulativeSubscriptions,
        cumulativeRevenue: Number(cumulativeRevenue.toFixed(2)),
        dau,
        mau,
        stickiness
      };
    });

    console.log(`[ADMIN-ANALYTICS] Built ${analytics.length} days. Sample last day:`, analytics[analytics.length - 1]);

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
