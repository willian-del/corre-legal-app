import { supabase } from "@/integrations/supabase/client";

export async function checkActiveSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_active_subscription', {
      _user_id: userId
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error checking subscription:', error);
      }
      return false;
    }

    return data === true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error checking subscription:', error);
    }
    return false;
  }
}

export async function getActiveSubscription(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_active_subscription', {
      _user_id: userId
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching subscription:', error);
      }
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error fetching subscription:', error);
    }
    return null;
  }
}
