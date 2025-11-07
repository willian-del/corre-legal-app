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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (import.meta.env.DEV) {
        console.error('No active session when trying to update profile');
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (import.meta.env.DEV) {
        console.error('No active session when trying to get masked CPF');
      }
      return null;
    }

    const { data, error } = await supabase.functions.invoke('manage-cpf', {
      body: {
        operation: 'get'
      }
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching masked CPF:', error);
      }
      return null;
    }

    return data?.maskedCPF || null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching masked CPF:', error);
    }
    return null;
  }
}

export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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
