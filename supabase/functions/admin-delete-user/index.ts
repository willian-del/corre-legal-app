import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

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
    
    // Initialize Supabase client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[ADMIN-DELETE-USER] Missing authorization header');
      throw new Error('Autorização necessária');
    }

    // Initialize client with user's JWT for authentication
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      console.error('[ADMIN-DELETE-USER] Authentication failed:', authError);
      throw new Error('Usuário não autenticado');
    }

    // Verify the user is an admin
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', {
      _user_id: adminUser.id
    });

    if (adminError || !isAdmin) {
      console.error('[ADMIN-DELETE-USER] Admin verification failed:', adminError);
      throw new Error('Permissão negada: apenas administradores podem deletar usuários');
    }

    // Parse request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    console.log(`[ADMIN-DELETE-USER] Admin ${adminUser.id} attempting to delete user ${userId}`);

    // Prevent admin from deleting themselves
    if (adminUser.id === userId) {
      throw new Error('Você não pode deletar sua própria conta pela área administrativa');
    }

    // Check if target user is an admin
    const { data: targetIsAdmin } = await supabaseAdmin.rpc('is_admin', {
      _user_id: userId
    });

    // If target is admin, check if they're the last one
    if (targetIsAdmin) {
      const { count: adminCount } = await supabaseAdmin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminCount && adminCount <= 1) {
        throw new Error('Não é possível deletar o último administrador do sistema');
      }
    }

    // Get user details for audit log before deletion
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, service_type')
      .eq('id', userId)
      .single();

    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userAuth?.user?.email;

    const { data: userSubscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Delete in order (respecting foreign keys)
    console.log('[ADMIN-DELETE-USER] Step 1: Deleting user subscriptions');
    const { error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);
    if (subsError) {
      console.error('[ADMIN-DELETE-USER] Error deleting subscriptions:', subsError);
      throw new Error('Erro ao deletar assinaturas do usuário');
    }

    console.log('[ADMIN-DELETE-USER] Step 2: Deleting user roles');
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) {
      console.error('[ADMIN-DELETE-USER] Error deleting roles:', rolesError);
      throw new Error('Erro ao deletar roles do usuário');
    }

    console.log('[ADMIN-DELETE-USER] Step 3: Deleting audit logs');
    // Delete logs where user is target or admin
    const { error: logsError } = await supabaseAdmin
      .from('admin_audit_logs')
      .delete()
      .or(`target_user_id.eq.${userId},admin_user_id.eq.${userId}`);
    if (logsError) {
      console.error('[ADMIN-DELETE-USER] Error deleting audit logs:', logsError);
      // Don't throw, continue with deletion
    }

    console.log('[ADMIN-DELETE-USER] Step 4: Deleting profile');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) {
      console.error('[ADMIN-DELETE-USER] Error deleting profile:', profileError);
      throw new Error('Erro ao deletar perfil do usuário');
    }

    console.log('[ADMIN-DELETE-USER] Step 5: Deleting auth user');
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('[ADMIN-DELETE-USER] Error deleting auth user:', authDeleteError);
      throw new Error('Erro ao deletar usuário do sistema de autenticação');
    }

    // Create audit log
    console.log('[ADMIN-DELETE-USER] Step 6: Creating audit log');
    const { error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUser.id,
        action: 'delete_user',
        target_type: 'user',
        target_user_id: userId,
        target_id: userId,
        details: {
          deleted_user_name: userProfile?.full_name || 'N/A',
          deleted_user_email: userEmail || 'N/A',
          deleted_user_phone: userProfile?.phone || 'N/A',
          deleted_user_service_type: userProfile?.service_type || 'N/A',
          had_subscription: !!userSubscription,
          subscription_plan: userSubscription?.plan_type || null,
          subscription_status: userSubscription?.status || null,
          was_admin: targetIsAdmin
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    if (auditError) {
      console.error('[ADMIN-DELETE-USER] Error creating audit log:', auditError);
      // Don't throw, user already deleted
    }

    console.log(`[ADMIN-DELETE-USER] Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário deletado com sucesso',
        deletedUserId: userId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[ADMIN-DELETE-USER] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao deletar usuário'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
