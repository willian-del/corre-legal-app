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

    const { userId, updates, addRole, removeRole } = await req.json();

    if (!userId) throw new Error('userId is required');

    console.log('[ADMIN-UPDATE-USER] Admin:', adminUser.id, 'updating user:', userId);

    const auditActions = [];

    // Update profile fields (only safe fields)
    if (updates) {
      const allowedFields = ['phone', 'service_type'];
      const safeUpdates: any = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          safeUpdates[field] = updates[field];
        }
      }

      if (Object.keys(safeUpdates).length > 0) {
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update(safeUpdates)
          .eq('id', userId);

        if (updateError) throw updateError;

        auditActions.push({
          action: 'update_profile',
          details: { updates: safeUpdates }
        });
      }
    }

    // Add role
    if (addRole) {
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: userId,
          role: addRole,
          created_by: adminUser.id
        });

      // Ignore duplicate role errors
      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      auditActions.push({
        action: 'add_role',
        details: { role: addRole }
      });
    }

    // Remove role
    if (removeRole) {
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', removeRole);

      if (roleError) throw roleError;

      auditActions.push({
        action: 'remove_role',
        details: { role: removeRole }
      });
    }

    // Log all audit actions
    for (const auditAction of auditActions) {
      await supabaseClient.from('admin_audit_logs').insert({
        admin_user_id: adminUser.id,
        action: `user_${auditAction.action}`,
        target_user_id: userId,
        target_type: 'user',
        target_id: userId,
        details: auditAction.details,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent')
      });
    }

    console.log('[ADMIN-UPDATE-USER] Success - actions:', auditActions.length);

    return new Response(
      JSON.stringify({ success: true, actions: auditActions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ADMIN-UPDATE-USER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
