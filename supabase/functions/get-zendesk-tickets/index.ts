import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Buscar perfil do usuário para pegar o email
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userEmail = user.email;

    // Configuração do Zendesk
    const zendeskSubdomain = Deno.env.get('ZENDESK_SUBDOMAIN');
    const zendeskApiKey = Deno.env.get('ZENDESK_API_KEY');
    
    if (!zendeskSubdomain || !zendeskApiKey) {
      console.error('Missing Zendesk configuration');
      return new Response(
        JSON.stringify({ 
          tickets: [],
          error: 'Zendesk not configured'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Buscar tickets do usuário no Zendesk
    // Formato da autenticação: email/token:api_token
    const authString = btoa(`${userEmail}/token:${zendeskApiKey}`);
    
    const zendeskUrl = `https://${zendeskSubdomain}.zendesk.com/api/v2/search.json?query=type:ticket requester:${userEmail}`;
    
    console.log(`Fetching Zendesk tickets for user: ${userEmail}`);
    
    const zendeskResponse = await fetch(zendeskUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!zendeskResponse.ok) {
      const errorText = await zendeskResponse.text();
      console.error('Zendesk API error:', errorText);
      throw new Error(`Zendesk API error: ${zendeskResponse.status}`);
    }

    const zendeskData = await zendeskResponse.json();
    
    // Formatar tickets para o frontend
    const tickets = (zendeskData.results || []).map((ticket: any) => ({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      type: 'zendesk',
      url: `https://${zendeskSubdomain}.zendesk.com/agent/tickets/${ticket.id}`
    }));

    console.log(`Found ${tickets.length} Zendesk tickets for user ${userEmail}`);

    return new Response(
      JSON.stringify({ tickets }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in get-zendesk-tickets:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        tickets: [] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Retornar 200 mesmo com erro para não quebrar o frontend
      }
    );
  }
});
