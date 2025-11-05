import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CANCEL-SUBSCRIPTION] Function invoked');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CANCEL-SUBSCRIPTION] No authorization header');
      throw new Error('Sem autorização');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('[CANCEL-SUBSCRIPTION] User authentication failed:', userError);
      throw new Error('Usuário não autenticado');
    }

    const userId = userData.user.id;
    console.log('[CANCEL-SUBSCRIPTION] User authenticated:', userId);

    // Atualizar status da assinatura para 'cancelled'
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (updateError) {
      console.error('[CANCEL-SUBSCRIPTION] Error updating subscription:', updateError);
      throw new Error(`Erro ao cancelar: ${updateError.message}`);
    }

    console.log('[CANCEL-SUBSCRIPTION] Subscription cancelled successfully for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Plano cancelado com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CANCEL-SUBSCRIPTION] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
