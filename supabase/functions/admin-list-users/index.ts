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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) throw new Error('Not authenticated');

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id
    });

    if (adminError || !isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ADMIN-LIST-USERS] Admin user:', user.id, 'listing users');

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const hasSubscription = url.searchParams.get('hasSubscription');
    const isAdminFilter = url.searchParams.get('isAdmin');

    const offset = (page - 1) * limit;

    // Build query for profiles
    let profilesQuery = supabaseClient
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      profilesQuery = profilesQuery.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: profiles, error: profilesError, count } = await profilesQuery
      .range(offset, offset + limit - 1);

    if (profilesError) throw profilesError;

    // Get user IDs from profiles
    const userIds = profiles?.map(p => p.id) || [];

    // Fetch subscriptions separately
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('status', 'active')
      .order('expires_at', { ascending: false });

    if (subscriptionsError) throw subscriptionsError;

    // Create a map of user_id to subscription
    const subscriptionsMap = new Map();
    subscriptions?.forEach(sub => {
      if (!subscriptionsMap.has(sub.user_id)) {
        subscriptionsMap.set(sub.user_id, sub);
      }
    });

    // Get user roles
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) throw rolesError;

    // Map roles to users
    const rolesMap = new Map();
    roles?.forEach(r => {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id).push(r.role);
    });

    // Get auth users for email
    const { data: { users: authUsers }, error: authUsersError } = await supabaseClient.auth.admin.listUsers();
    
    if (authUsersError) throw authUsersError;

    const authUsersMap = new Map(authUsers.map(u => [u.id, u]));

    // Combine data
    let users = profiles?.map(profile => {
      const authUser = authUsersMap.get(profile.id);
      const userRoles = rolesMap.get(profile.id) || [];
      const subscription = subscriptionsMap.get(profile.id) || null;

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: authUser?.email || '',
        phone: profile.phone,
        service_type: profile.service_type,
        created_at: profile.created_at,
        roles: userRoles,
        is_admin: userRoles.includes('admin'),
        subscription: subscription ? {
          id: subscription.id,
          plan_type: subscription.plan_type,
          status: subscription.status,
          expires_at: subscription.expires_at,
          amount_paid: subscription.amount_paid,
          stripe_subscription_id: subscription.stripe_subscription_id
        } : null
      };
    }) || [];

    // Apply filters
    if (hasSubscription !== null) {
      const filterValue = hasSubscription === 'true';
      users = users.filter(u => filterValue ? u.subscription !== null : u.subscription === null);
    }

    if (isAdminFilter !== null) {
      const filterValue = isAdminFilter === 'true';
      users = users.filter(u => u.is_admin === filterValue);
    }

    console.log('[ADMIN-LIST-USERS] Returning', users.length, 'users (total:', count, ')');

    return new Response(
      JSON.stringify({ 
        users,
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN-LIST-USERS] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
