import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [countdown, setCountdown] = useState(5);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isFirstPurchase = searchParams.get('first_purchase') === 'true';
  
  // Mercado Pago return parameters
  const paymentId = searchParams.get('payment_id');
  const paymentStatus = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Process Mercado Pago payment if payment_id present
  useEffect(() => {
    if (!user || !paymentId || !externalReference) return;
    
    setVerifying(true);
    
    // Extract plan type from external_reference (format: userId_planType_timestamp)
    const parts = externalReference.split('_');
    const planType = parts[1] || 'monthly';
    
    supabase.functions
      .invoke('process-payment', {
        body: {
          paymentId: paymentId,
          status: paymentStatus || 'pending',
          planType: planType,
          amount: 0, // Will be verified with Mercado Pago API
          paymentMethod: 'mercadopago',
        },
      })
      .catch((e) => {
        if (import.meta.env.DEV) {
          console.error('process-payment error', e);
        }
      })
      .finally(() => setVerifying(false));
  }, [user, paymentId, paymentStatus, externalReference]);

  // Determine redirect destination
  useEffect(() => {
    const determineRedirect = async () => {
      if (!user) {
        setRedirectTo('/auth');
        return;
      }

      // Check if profile is complete (has CPF)
      const { data: profile } = await supabase
        .from('profiles')
        .select('cpf_hash')
        .eq('id', user.id)
        .single();

      if (!profile?.cpf_hash) {
        setRedirectTo('/onboarding');
      } else {
        setRedirectTo('/meu-corre');
      }
    };

    determineRedirect();
  }, [user]);

  // Automatic redirect countdown
  useEffect(() => {
    if (!redirectTo || verifying) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [redirectTo, navigate, verifying]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-in fade-in duration-500">
        <Badge variant="default" className="mb-4 shadow-glow">
          Sucesso
        </Badge>
        <div className="bg-gradient-to-b from-card to-card/50 rounded-2xl p-8 shadow-elevated border border-primary/20">
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground mb-4">
                Seu plano foi ativado com sucesso
              </p>
            </div>

            <div className="bg-gradient-to-br from-secondary/50 to-secondary/30 border border-primary/30 rounded-lg p-4">
              <p className="text-sm text-primary mb-2 font-semibold">
                Próximos passos:
              </p>
              <ol className="text-sm text-muted-foreground text-left space-y-2 max-w-md mx-auto">
                <li>1. {isFirstPurchase ? 'Verifique seu email para receber suas credenciais de acesso' : 'Seu plano foi renovado com sucesso'}</li>
                <li>2. Faça login na área de cliente</li>
                <li>3. {isFirstPurchase ? 'Complete seu cadastro com CPF e telefone' : 'Aproveite todos os benefícios do seu plano!'}</li>
                <li>4. {isFirstPurchase ? 'Altere sua senha temporária por uma segura' : 'Consulte os detalhes da sua cobertura no painel'}</li>
              </ol>
              
              {isFirstPurchase && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/20">
                  💡 Se você não receber o email em 5 minutos, verifique sua pasta de spam ou lixo eletrônico.
                </p>
              )}
            </div>

            {verifying && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-center text-primary">Confirmando sua ativação...</p>
              </div>
            )}

            {redirectTo && countdown > 0 && !verifying && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-center text-primary">
                  Redirecionando em <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="shadow-glow hover:shadow-glow"
              >
                Fazer Login
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
                className="border-primary/30 hover:bg-primary/10"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
