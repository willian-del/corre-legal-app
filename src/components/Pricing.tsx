import { Check, Medal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useInView } from "@/hooks/use-in-view";
import plansConfig from "@/config/plans.json";

interface Plan {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  duration: string;
  benefits: string[];
  installments: string;
  featured?: boolean;
  badge?: string;
}
const Pricing = () => {
  console.log(plansConfig);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { ref: cardRef, isInView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
    rootMargin: "-50px",
  });

  const handleSubscribe = (planId: string) => {
    // Check if user is logged in
    if (!user) {
      // Redirecionar para cadastro sem parâmetros de checkout
      navigate('/auth?signup=true');
      return;
    }

    // Navigate to checkout page
    navigate(`/checkout?plan=${planId}`);
  };

  const plans = Object.values(plansConfig) as Plan[];
  return (
    <section id="pricing" className="py-12 md:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Proteção Completa para o Seu <span className="text-primary">Corre</span>
            </h2>
          </div>

          {/* Plans Banner */}
          <div className="space-y-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                ref={plan.featured ? cardRef : undefined}
                className={`
                bg-card
                border border-border
                rounded-xl
                p-5 md:p-6
                shadow-lg
                flex flex-col md:flex-row
                items-center
                justify-between
                gap-5 md:gap-8
                transition-all duration-700 ease-out
                ${plan.featured && isInView ? "opacity-100 translate-y-0" : ""}
                ${plan.featured && !isInView ? "opacity-0 translate-y-12" : ""}
              `}
                style={{
                  willChange: plan.featured && !isInView ? "opacity, transform" : "auto",
                }}
              >
                {/* Seção Esquerda: Título */}
                <div className="border-l-4 border-primary pl-4 text-center md:text-left flex-shrink-0">
                  <span className="text-muted-foreground text-sm uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
                    {plan.badge && <span className="text-base">⭐</span>}
                    {plan.name}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                    <span className="text-base">🛡️</span>
                    {plan.duration} de Proteção
                  </h3>
                </div>

                {/* Seção Central: Benefícios */}
                <div className="flex-1 bg-muted/30 rounded-lg p-4 w-full md:w-auto">
                  <ul className="space-y-2 text-sm">
                    {plan.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Seção Direita: Preço + CTA */}
                <div className="text-center md:text-right flex-shrink-0 w-full md:w-auto">
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {plan.displayPrice}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    {plan.installments}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 w-full md:w-auto"
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>{user ? "CONTRATAR AGORA" : "CADASTRE-SE AGORA"}</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Security Badge */}
          <div className="text-center mt-8 text-sm text-muted-foreground">🔒 Pagamento seguro com Mercado Pago</div>
        </div>
      </div>
    </section>
  );
};
export default Pricing;
