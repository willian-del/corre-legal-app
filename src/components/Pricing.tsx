import { Check, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Bronze",
      price: "14,90",
      description: "Ideal pra quem quer suporte básico",
      features: [
        "Canal de atendimento jurídico",
        "Orientações rápidas",
        "Suporte via WhatsApp"
      ],
      buttonText: "Assinar Bronze",
      buttonVariant: "default" as const,
      checkColor: "text-primary",
      icon: null,
      isPopular: false
    },
    {
      name: "Prata",
      price: "19,90",
      description: "Ideal pra quem quer mais segurança",
      features: [
        "Tudo do Bronze",
        "Ajuda em casos de sinistro",
        "Suporte em acidentes",
        "Acompanhamento de processos"
      ],
      buttonText: "Assinar Prata",
      buttonVariant: "default" as const,
      checkColor: "text-accent",
      icon: Sparkles,
      iconColor: "text-accent",
      isPopular: true,
      highlighted: true
    },
    {
      name: "Ouro",
      price: "24,90",
      description: "Ideal pra quem quer rodar tranquilo e protegido",
      features: [
        "Tudo do Prata",
        "Monitoramento de multas",
        "Defesa de multas",
        "Prevenção proativa",
        "Prioridade no atendimento"
      ],
      buttonText: "Assinar Ouro",
      buttonVariant: "default" as const,
      checkColor: "text-primary",
      icon: Crown,
      iconColor: "text-primary",
      isPopular: false
    }
  ];

  const handleSubscribe = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-blue-600 to-blue-700">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Nossos <span className="text-blue-100">Planos</span>
          </h2>
          <p className="text-xl text-blue-50 leading-relaxed">
            Escolha o plano ideal para suas necessidades e rode com tranquilidade
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 relative ${
                  plan.highlighted
                    ? "border-4 border-accent lg:scale-105 shadow-2xl"
                    : "border border-gray-200"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    Mais Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  {Icon && (
                    <div className="flex justify-center mb-4">
                      <Icon className={`w-12 h-12 ${plan.iconColor}`} />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-gray-900">R$ {plan.price}</span>
                    <span className="text-gray-600">/mês</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 ${plan.checkColor} flex-shrink-0 mt-0.5`} />
                      <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={handleSubscribe}
                  variant={plan.highlighted ? "default" : "default"}
                  className={`w-full text-base py-6 ${
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