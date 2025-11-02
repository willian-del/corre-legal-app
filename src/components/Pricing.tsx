import { Check, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Bronze",
      price: "60,00",
      description: "Ideal pra quem quer suporte básico",
      features: [
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

  const handleSubscribe = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
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
                className={`bg-card rounded-2xl p-6 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 relative ${
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

                <div className="text-center mb-4">
                  {Icon && (
                    <div className="flex justify-center mb-3">
                      <Icon className={`w-10 h-10 ${plan.iconColor}`} />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-foreground">R$ {plan.price}</span>
                    <span className="text-muted-foreground text-sm">por 6 meses</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 ${plan.checkColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-muted-foreground text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleSubscribe}
                  variant={plan.highlighted ? "default" : "default"}
                  className={`w-full text-base py-5 ${
                    plan.highlighted
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {plan.buttonText}
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