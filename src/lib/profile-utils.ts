import { supabase } from "@/integrations/supabase/client";
import { encryptData, hashData } from '@/lib/encryption';

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
    const updates: any = {
      phone: data.phone,
      service_type: data.service_type,
    };

    // CPF só pode ser definido uma vez (no onboarding)
    if (data.cpf) {
      const encryptedCpf = encryptData(data.cpf);
      const cpfHash = hashData(data.cpf);
      updates.cpf = encryptedCpf;
      updates.cpf_hash = cpfHash;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    return { error };
  } catch (error: any) {
    return { error };
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
