import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const saveCpfSchema = z.object({
  operation: z.literal('save'),
  cpf: z.string().min(11).max(14).regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Invalid CPF format')
});

const getCpfSchema = z.object({
  operation: z.literal('get')
});

// Server-side encryption using Web Crypto API with AES-GCM
async function encryptCPF(cpf: string): Promise<string> {
  const encryptionKey = Deno.env.get('CPF_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('CPF_ENCRYPTION_KEY not configured');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(cpf);
  
  // Generate key from secret
  const keyData = encoder.encode(encryptionKey.padEnd(32, '0').substring(0, 32));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

// Hash CPF for lookups (SHA-256 with salt)
async function hashCPF(cpf: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = 'lovable-salt-2024';
  const data = encoder.encode(cpf + salt);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Mask CPF for display (show first 3 and last 2 digits)
function maskCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    return '***.***.***-**';
  }
  // Show first 3 digits and last 2 digits: 123.***.***-10
  const first3 = cleaned.slice(0, 3);
  const last2 = cleaned.slice(-2);
  return `${first3}.***.***-${last2}`;
}

// Validate CPF using official algorithm
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // All same digits
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  if (digit1 !== parseInt(cleaned.charAt(9))) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  if (digit2 !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication using Supabase's built-in JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[MANAGE-CPF] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MANAGE-CPF] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse and validate request body
    const body = await req.json();
    
    // Validate input with zod
    let validated;
    try {
      if (body.operation === 'save') {
        validated = saveCpfSchema.parse(body);
      } else if (body.operation === 'get') {
        validated = getCpfSchema.parse(body);
      } else {
        return new Response(
          JSON.stringify({ error: 'Operação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`[MANAGE-CPF] Input validation failed:`, error.errors);
        return new Response(
          JSON.stringify({ error: 'Formato de dados inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    if (validated.operation === 'save') {
      const { cpf } = validated;

      // Validate CPF format
      if (!isValidCPF(cpf)) {
        console.log(`[MANAGE-CPF] Invalid CPF format for user ${userId}`);
        return new Response(
          JSON.stringify({ error: 'CPF inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if CPF already exists for another user
      const cpfHash = await hashCPF(cpf);

      const { data: existingProfile, error: checkError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('cpf_hash', cpfHash)
        .neq('id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('[MANAGE-CPF] Error checking existing CPF:', checkError);
      }

      if (existingProfile) {
        console.log(`[MANAGE-CPF] CPF already exists for another user`);
        return new Response(
          JSON.stringify({ error: 'CPF já cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Encrypt CPF
      const encryptedCPF = await encryptCPF(cpf);

      // Store in database
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          cpf: encryptedCPF,
          cpf_hash: cpfHash,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[MANAGE-CPF] Error saving CPF:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar CPF' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return masked CPF
      const maskedCPF = maskCPF(cpf);
      
      console.log(`[MANAGE-CPF] CPF saved successfully for user ${userId}`);
      
      return new Response(
        JSON.stringify({ success: true, maskedCPF }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (validated.operation === 'get') {
      // Get masked CPF (never return decrypted version)
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('cpf, cpf_hash')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[MANAGE-CPF] Error fetching profile:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar CPF' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!data || !data.cpf_hash) {
        return new Response(
          JSON.stringify({ maskedCPF: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return masked format (we can't decrypt, just show it's set)
      // If we had the last 2 digits stored separately, we could show them
      // For now, just indicate CPF is set
      return new Response(
        JSON.stringify({ maskedCPF: '***.***.***-**' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // This should never be reached due to validation, but TypeScript needs it
    return new Response(
      JSON.stringify({ error: 'Operação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MANAGE-CPF] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
