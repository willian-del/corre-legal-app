import { Check, Medal } from "lucide-react";
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

  const plans = [
    {
      name: "Bronze",
      price: "60,00",
      description: "Ideal pra quem quer suporte básico",
      features: [
        "6 meses de cobertura",
        "Canal de Atendimento Jurídico Especializado"
      ],
      buttonText: "Contratar Bronze",
      buttonVariant: "default" as const,
      checkColor: "text-primary",
      icon: Medal,
      iconColor: "text-amber-700",
      isPopular: false
    },
    {
      name: "Prata",
      price: "120,00",
      description: "Ideal pra quem quer mais segurança",
      features: [
        "6 meses de cobertura",
        "Canal de Atendimento Jurídico Especializado",
        "Suporte no Bloqueio e Reativação de Conta"
      ],
      buttonText: "Contratar Prata",
      buttonVariant: "default" as const,
      checkColor: "text-accent",
      icon: Medal,
      iconColor: "text-gray-400",
      isPopular: true,
      highlighted: true
    },
    {
      name: "Ouro",
      price: "180,00",
      description: "Ideal pra quem quer rodar tranquilo e protegido",
      features: [
        "6 meses de cobertura",
        "Canal de Atendimento Jurídico Especializado",
        "Suporte no Bloqueio e Reativação de Conta",
        "Gestão de Multas e Problemas com a CNH"
      ],
      buttonText: "Contratar Ouro",
      buttonVariant: "default" as const,
      checkColor: "text-primary",
      icon: Medal,
      iconColor: "text-yellow-500",
      isPopular: false,
      highlighted: false
    }
  ];

  const handleSubscribe = async (planType: PlanType) => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para contratar um plano.",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/auth?redirect=' + encodeURIComponent('/#pricing'))}
          >
            Fazer Login
          </Button>
        ),
      });
      return;
    }

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
    <section id="pricing" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Nossos <span className="text-primary">Planos</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Escolha o plano ideal e garanta 6 meses de cobertura jurídica
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`bg-card rounded-2xl p-5 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 relative flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-primary lg:scale-105 shadow-elevated"
                    : "border border-border hover:border-primary/50"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-6 py-2 rounded-full text-sm font-bold shadow-elevated">
                    Mais Popular
                  </div>
                )}

                <div className="text-center mb-3">
                  {Icon && (
                    <div className="flex justify-center mb-2">
                      <Icon className={`w-8 h-8 ${plan.iconColor}`} />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-foreground">R$ {plan.price}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-5 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className={`w-4 h-4 ${plan.checkColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-muted-foreground text-xs leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.name.toLowerCase() as PlanType)}
                  variant={plan.highlighted ? "default" : "default"}
                  disabled={loadingPlan !== null}
                  className={`w-full text-sm py-4 ${
                    plan.highlighted
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {loadingPlan === plan.name.toLowerCase() 
                    ? "Processando..." 
                    : !user 
                      ? "Fazer Login para Contratar"
                      : plan.buttonText}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;