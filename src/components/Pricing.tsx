import { Check, Medal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { type PlanType } from "@/lib/stripe-config";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);


  const handleSubscribe = async (planType: PlanType) => {
    // Check if user is logged in
    if (!user) {
      navigate('/auth?signup=true&redirect=/meu-corre');
      return;
    }

    // Usuário já está logado - abrir checkout do Stripe
    setLoadingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan_type: planType }
      });

      if (error) {
        // Detectar erro de configuração de Price ID
        if (error.message?.includes('INVALID_PRICE_ID')) {
          throw new Error('CONFIG_ERROR');
        }
        throw error;
      }

      if (data?.url) {
        const newWindow = window.open(data.url, '_blank');
        
        // Detectar se o pop-up foi bloqueado
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          toast({
            title: "Pop-up bloqueado",
            description: "Por favor, permita pop-ups para este site e tente novamente.",
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(data.url, '_blank')}
              >
                Tentar novamente
              </Button>
            ),
          });
          return;
        }
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será direcionado para o Stripe para finalizar o pagamento.",
        });
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error creating checkout:", error);
      }
      
      let title = "Erro ao processar pagamento";
      let description = "Não foi possível iniciar o processo de pagamento. Por favor, tente novamente.";
      
      if (error.message === 'CONFIG_ERROR') {
        title = "Erro de configuração";
        description = "Há um problema na configuração dos planos. Por favor, entre em contato com o suporte (Código: CONFIG_PRICE_ID_INVALID).";
      } else if (error.message?.includes('Network')) {
        description = "Problema de conexão. Verifique sua internet e tente novamente.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSubscribe(planType)}
          >
            Tentar novamente
          </Button>
        ),
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Proteção Completa para o Seu <span className="text-primary">Corre</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              6 meses de cobertura jurídica especializada
            </p>
          </div>

          {/* Card CTA Grande */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 md:p-12 border-2 border-primary/50 shadow-2xl">
            
            {/* Ícone e Badge */}
            <div className="flex flex-col items-center mb-8">
              <Medal className="w-20 h-20 text-yellow-500 mb-4" />
              <span className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold text-sm">
                PLANO OURO
              </span>
            </div>

            {/* Preço destacado */}
            <div className="text-center mb-8">
              <div className="text-5xl md:text-6xl font-bold text-foreground mb-2">
                R$ 180,00
              </div>
              <p className="text-lg text-muted-foreground">
                à vista ou em até 10x no cartão
              </p>
              <p className="text-xl font-semibold text-primary mt-2">
                6 meses de cobertura completa
              </p>
            </div>

            {/* Lista de benefícios */}
            <div className="bg-card/50 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
              <h3 className="font-bold text-lg mb-4 text-center">O que está incluído:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Canal de Atendimento Jurídico Especializado</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Suporte no Bloqueio e Reativação de Conta</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Gestão de Multas, Suspensão e Cassação da CNH</span>
                </li>
              </ul>
            </div>

            {/* Botão CTA */}
            <Button
              onClick={() => handleSubscribe('ouro')}
              size="lg"
              disabled={loadingPlan !== null}
              className="w-full text-xl py-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {loadingPlan ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : !user ? (
                "Cadastre-se e Contrate Agora"
              ) : (
                "Contratar Plano Ouro"
              )}
            </Button>

            {/* Footer text */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              ✅ Pagamento 100% seguro via Stripe
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Pricing;