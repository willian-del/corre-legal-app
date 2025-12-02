import { supabase } from "@/integrations/supabase/client";

export async function isProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cpf_hash, phone, service_type')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error checking profile:', error);
      }
      return false;
    }
    
    // If no row exists yet, profile is incomplete
    if (!data) {
      return false;
    }
    
    return !!(data.cpf_hash && data.phone && data.service_type);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error checking profile:', error);
    }
    return false;
  }
}

export async function updateProfile(userId: string, data: {
  cpf?: string;
  phone: string;
  service_type: string;
}) {
  try {
    // Verify we have a valid session before making any updates
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      if (import.meta.env.DEV) {
        console.error('No valid session when trying to update profile');
      }
      return { error: { message: 'Sessão expirada. Por favor, faça login novamente.' } };
    }

    // Double-check the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      if (import.meta.env.DEV) {
        console.error('No authenticated user when trying to update profile');
      }
      return { error: { message: 'Sessão expirada. Por favor, faça login novamente.' } };
    }

    // Use upsert to create or update profile fields (phone and service_type)
    const updates: any = {
      id: userId,
      phone: data.phone,
      service_type: data.service_type,
    };

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'id' });

    if (upsertError) {
      if (import.meta.env.DEV) {
        console.error('Error upserting profile:', upsertError);
      }
      return { error: upsertError };
    }

    // If CPF is provided, use secure edge function to encrypt and store it
    if (data.cpf) {
      const { data: cpfResult, error: cpfError } = await supabase.functions.invoke('manage-cpf', {
        body: {
          operation: 'save',
          cpf: data.cpf
        }
      });

      if (cpfError) {
        if (import.meta.env.DEV) {
          console.error('Error saving CPF via edge function:', cpfError);
        }
        return { error: cpfError };
      }

      if (cpfResult?.error) {
        return { error: { message: cpfResult.error } };
      }
    }

    if (import.meta.env.DEV) {
      console.log('Profile updated successfully for user:', userId);
    }
    return { error: null };
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error('Error updating profile:', error);
    }
    return { error };
  }
}

// Get masked CPF from secure edge function
export async function getMaskedCPF(userId: string): Promise<string | null> {
  try {
    // Verify we have a valid session before calling the edge function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      if (import.meta.env.DEV) {
        console.log('No valid session when trying to get masked CPF');
      }
      return null;
    }

    // Double-check the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      if (import.meta.env.DEV) {
        console.log('No authenticated user when trying to get masked CPF');
      }
      return null;
    }

    const { data, error } = await supabase.functions.invoke('manage-cpf', {
      body: {
        operation: 'get'
      }
    });

    if (error) {
      // Don't log error if it's just an auth issue (401)
      if (error.message?.includes('401') || error.message?.includes('autorizado')) {
        if (import.meta.env.DEV) {
          console.log('Auth error fetching masked CPF (session expired)');
        }
      } else if (import.meta.env.DEV) {
        console.error('Error fetching masked CPF:', error);
      }
      return null;
    }

    return data?.maskedCPF || null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.log('Error fetching masked CPF:', error);
    }
    return null;
  }
}

export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, service_type, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching profile:', error);
      }
      return null;
    }

    return data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching profile:', error);
    }
    return null;
  }
}

// Verificar se o usuário já viu a tela de boas-vindas
export async function hasSeenWelcome(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('has_seen_welcome')
      .eq('id', userId)
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error checking welcome status:', error);
      }
      // Em caso de erro, retornar false para mostrar a tela de boas-vindas (mais seguro)
      return false;
    }

    // Se undefined ou null, mostrar a tela de boas-vindas
    return data?.has_seen_welcome === true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error checking welcome status:', error);
    }
    // Em caso de exceção, mostrar a tela de boas-vindas
    return false;
  }
}

// Marcar que o usuário viu a tela de boas-vindas
export async function markWelcomeAsSeen(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ has_seen_welcome: true })
      .eq('id', userId);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error marking welcome as seen:', error);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error marking welcome as seen:', error);
    }
  }
}
