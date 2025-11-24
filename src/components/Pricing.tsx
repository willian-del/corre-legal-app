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
      navigate(`/auth?signup=true&checkout=true&plan=${planId}`);
      return;
    }

    // Navigate to checkout page
    navigate(`/checkout?plan=${planId}`);
  };

  const plans = Object.values(plansConfig) as Plan[];
  return (
    <section id="pricing" className="py-12 md:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Proteção Completa para o Seu <span className="text-primary">Corre</span>
            </h2>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-1 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                ref={plan.featured ? cardRef : undefined}
                className={`
                bg-gradient-to-br rounded-3xl p-6 md:p-8 
                border-2 shadow-xl
                transition-all duration-700 ease-out
                ${
                  plan.featured
                    ? "from-primary/10 to-accent/10 border-primary/50 shadow-2xl scale-105"
                    : "from-card to-card border-border"
                }
                ${plan.featured && isInView ? "opacity-100 translate-y-0" : ""}
                ${plan.featured && !isInView ? "opacity-0 translate-y-12" : ""}
              `}
                style={{
                  willChange: plan.featured && !isInView ? "opacity, transform" : "auto",
                }}
              >
                {/* Título com ícone inline */}
                <div className="text-center mb-4">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2 mb-2">
                    {plan.badge && <span className="text-2xl">⭐</span>}
                    {plan.name}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground flex items-center justify-center gap-2">
                    <span className="text-lg">🛡️</span>
                    {plan.duration} de Proteção Completa
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50 my-6"></div>

                {/* Lista de Benefícios Compacta */}
                <ul className="space-y-3 mb-6">
                  {plan.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary stroke-[3] flex-shrink-0 mt-0.5" />
                      <span className="text-sm md:text-base text-foreground/90">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Divider */}
                <div className="border-t border-border/50 my-6"></div>

                {/* Preço e Parcelamento */}
                <div className="text-center mb-6">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    {plan.displayPrice}
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {plan.installments}
                  </p>
                </div>

                {/* Botão CTA */}
                <Button
                  size="lg"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full text-base md:text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 ${
                    plan.featured ? "bg-primary hover:bg-primary/90" : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>{user ? "Assinar Agora" : "Começar Agora"}</>
                  )}
                </Button>
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
