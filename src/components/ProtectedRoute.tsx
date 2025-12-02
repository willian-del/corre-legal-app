import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { checkActiveSubscription } from '@/lib/subscription-utils';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
  requireCompleteProfile?: boolean;
}

const ProtectedRoute = ({ children, requireSubscription = true, requireCompleteProfile = true }: ProtectedRouteProps) => {
  const { user, loading, profileComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  // Limpar waitingForAuth quando user for atualizado pelo AuthContext
  useEffect(() => {
    if (user && waitingForAuth) {
      if (import.meta.env.DEV) {
        console.log('[ProtectedRoute] User propagated to state, clearing waitingForAuth');
      }
      setWaitingForAuth(false);
    }
  }, [user, waitingForAuth]);

  useEffect(() => {
    async function checkAccess() {
      if (!loading && !user) {
        // CORREÇÃO: Verificar sessão diretamente com Supabase antes de redirecionar
        // Isso evita race conditions onde o React state ainda não atualizou após signup
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (import.meta.env.DEV) {
            console.log('[ProtectedRoute] No session found, redirecting to auth');
          }
          navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
        } else {
          // Sessão existe - VALIDAR que usuário ainda existe no servidor
          const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !serverUser) {
            // Sessão stale - usuário foi deletado, fazer logout
            console.log('[ProtectedRoute] Stale session detected (user deleted), signing out');
            await supabase.auth.signOut();
            navigate('/auth');
            return;
          }
          
          // Sessão válida mas React state não atualizou ainda
          // MARCAR que está esperando propagação - NÃO retornar null
          if (import.meta.env.DEV) {
            console.log('[ProtectedRoute] Session exists but state not updated yet, setting waitingForAuth=true');
          }
          setWaitingForAuth(true);
        }
        return;
      }

      if (user) {
        // Always validate profile completeness server-side - never trust client state
        if (requireCompleteProfile && location.pathname !== '/onboarding') {
          const { isProfileComplete } = await import('@/lib/profile-utils');
          
          // Adicionar retry para tolerar delay no salvamento de novos cadastros
          let complete = await isProfileComplete(user.id);
          
          // Se não completo na primeira tentativa, tentar mais uma vez após delay
          if (!complete) {
            await new Promise(resolve => setTimeout(resolve, 500));
            complete = await isProfileComplete(user.id);
          }
          
          if (!complete) {
            navigate('/onboarding');
            return;
          }
        }

        // Then check subscription if required
        if (requireSubscription) {
          const active = await checkActiveSubscription(user.id);
          setHasSubscription(active);
          setChecking(false);
          
          if (!active) {
            // User logged in but no active subscription
            // Don't auto-redirect, show message instead
          }
        } else {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    }

    checkAccess();
  }, [user, loading, profileComplete, navigate, location, requireSubscription, requireCompleteProfile]);

  if (loading || checking || waitingForAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se ainda não tem user e não está esperando auth, não renderizar nada
  // (o useEffect vai redirecionar para /auth ou setar waitingForAuth)
  if (!user) {
    return null;
  }

  if (requireSubscription && hasSubscription === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <div className="max-w-md w-full text-center bg-card rounded-2xl p-8 shadow-elevated border-2 border-primary/20">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Plano Necessário
          </h1>
          <p className="text-muted-foreground mb-6">
            Você precisa contratar um plano ativo para acessar esta área.
            Escolha o plano ideal para você e comece a usar todos os benefícios do Corre Legal.
          </p>
          <Button 
            onClick={() => {
              navigate('/');
              setTimeout(() => {
                const pricingSection = document.getElementById('pricing');
                if (pricingSection) {
                  pricingSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }
              }, 100);
            }} 
            size="lg" 
            className="w-full mb-3"
          >
            Ver Planos Disponíveis
          </Button>
          <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
