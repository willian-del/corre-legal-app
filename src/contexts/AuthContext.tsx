import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isProfileComplete } from '@/lib/profile-utils';
import { getAuthErrorMessage } from '@/lib/auth-error-messages';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, cpf: string, phone: string, serviceType: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  profileComplete: boolean | null;
  checkProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const { toast } = useToast();

  const checkProfile = async () => {
    if (!user) {
      setProfileComplete(null);
      return;
    }
    
    const complete = await isProfileComplete(user.id);
    setProfileComplete(complete);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Detect events that indicate invalid session
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed - clear everything
          console.log('Token refresh failed, clearing session');
          setSession(null);
          setUser(null);
          setProfileComplete(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setProfileComplete(null);
          setLoading(false);
          return;
        }

        // Normal logic continues
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check profile completeness after auth state changes
        if (session?.user) {
          setTimeout(() => {
            isProfileComplete(session.user.id).then(complete => {
              setProfileComplete(complete);
            });
          }, 0);
        } else {
          setProfileComplete(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        // Clear localStorage if there's an error
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          isProfileComplete(session.user.id).then(complete => {
            setProfileComplete(complete);
          });
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, cpf: string, phone: string, serviceType: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Note: CPF will be collected and encrypted securely during onboarding
      // We don't handle CPF encryption client-side anymore for security
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            service_type: serviceType
            // CPF will be set via secure edge function during onboarding
          }
        }
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: friendlyMessage
        });
        return { error };
      }

      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer login."
      });
      
      return { error: null };
    } catch (error: any) {
      const friendlyMessage = getAuthErrorMessage(error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: friendlyMessage
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const friendlyMessage = getAuthErrorMessage(error);
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: friendlyMessage
        });
        return { error };
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta."
      });

      return { error: null };
    } catch (error: any) {
      const friendlyMessage = getAuthErrorMessage(error);
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: friendlyMessage
      });
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading, profileComplete, checkProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
