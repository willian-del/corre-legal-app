import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // SECURITY FIX: Validate the caller's identity from JWT BEFORE processing
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[process-referral] Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth client to verify the user from JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error('[process-referral] Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { referral_code, referred_user_id, referred_name } = await req.json();

    console.log('[process-referral] Processing referral:', { 
      referral_code, 
      referred_user_id, 
      referred_name,
      authenticated_user: user.id 
    });

    if (!referral_code || !referred_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código de indicação e ID do usuário são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY FIX: Verify the authenticated user matches the referred_user_id
    // This prevents users from manipulating referral credits for other users
    if (user.id !== referred_user_id) {
      console.error('[process-referral] Authorization bypass attempt:', {
        authenticated_user: user.id,
        attempted_referred_user: referred_user_id
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado: você só pode processar indicações para sua própria conta' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now safe to use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to process the referral
    const { data, error } = await supabase.rpc('process_referral', {
      _referrer_code: referral_code,
      _referred_user_id: referred_user_id,
      _referred_name: referred_name || null
    });

    if (error) {
      console.error('[process-referral] Error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-referral] Result:', data);

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-referral] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
