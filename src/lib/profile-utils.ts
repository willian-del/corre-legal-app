import { supabase } from "@/integrations/supabase/client";

export async function isProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cpf_hash, phone, service_type')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error checking profile:', error);
      return false;
    }
    
    return !!(data?.cpf_hash && data?.phone && data?.service_type);
  } catch (error) {
    console.error('Error checking profile:', error);
    return false;
  }
}

export async function updateProfile(userId: string, data: {
  cpf?: string;
  phone: string;
  service_type: string;
}) {
  try {
    // Update phone and service type directly
    const updates: any = {
      phone: data.phone,
      service_type: data.service_type,
    };

    // If CPF is provided, use secure edge function to encrypt and store it
    if (data.cpf) {
      const { data: cpfResult, error: cpfError } = await supabase.functions.invoke('manage-cpf', {
        body: {
          operation: 'save',
          cpf: data.cpf
        }
      });

      if (cpfError) {
        console.error('Error saving CPF via edge function:', cpfError);
        return { error: cpfError };
      }

      if (cpfResult?.error) {
        return { error: { message: cpfResult.error } };
      }

      // Don't update CPF directly - edge function handles it
    }

    // Update other profile fields
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    return { error };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error };
  }
}

// Get masked CPF from secure edge function
export async function getMaskedCPF(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('manage-cpf', {
      body: {
        operation: 'get'
      }
    });

    if (error) {
      console.error('Error fetching masked CPF:', error);
      return null;
    }

    return data?.maskedCPF || null;
  } catch (error) {
    console.error('Error fetching masked CPF:', error);
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
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}
