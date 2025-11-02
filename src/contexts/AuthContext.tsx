import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { encryptData, hashData } from '@/lib/encryption';
import { isProfileComplete } from '@/lib/profile-utils';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      
      // Criptografar CPF antes de qualquer operação
      const encryptedCpf = encryptData(cpf);
      const cpfHash = hashData(cpf);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            // NÃO enviar CPF para raw_user_meta_data (segurança)
            phone: phone,
            service_type: serviceType
          }
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message
        });
        return { error };
      }

      // Inserir perfil com CPF criptografado após criar usuário
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            cpf: encryptedCpf,
            cpf_hash: cpfHash 
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Erro ao salvar CPF criptografado:', profileError);
        }
      }

      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer login."
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message
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
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message
        });
        return { error };
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta."
      });

      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message
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
