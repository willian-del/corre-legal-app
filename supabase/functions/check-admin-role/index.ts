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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.log('[CHECK-ADMIN-ROLE] Not authenticated');
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CHECK-ADMIN-ROLE] Checking admin status for user:', user.id);

    // Use SECURITY DEFINER function to check role
    const { data, error } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id
    });

    if (error) {
      console.error('[CHECK-ADMIN-ROLE] Error checking admin role:', error);
      throw error;
    }

    const isAdmin = data === true;
    console.log('[CHECK-ADMIN-ROLE] User is admin:', isAdmin);

    return new Response(
      JSON.stringify({ isAdmin }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CHECK-ADMIN-ROLE] Error:', error);
    return new Response(
      JSON.stringify({ isAdmin: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
