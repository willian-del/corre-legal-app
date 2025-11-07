import { useInView } from "@/hooks/use-in-view";

const Services = () => {
  const { ref: headerRef, isInView: headerInView } = useInView({ 
    threshold: 0.2, 
    triggerOnce: true 
  });

  const { ref: cardsRef, isInView: cardsInView } = useInView({ 
    threshold: 0.1, 
    triggerOnce: true 
  });

  const services = [
    {
      title: "Canal de Atendimento Jurídico Especializado",
      description: "Orientação jurídica especializada para as principais situações do seu dia a dia — dentro e fora dos apps, para você e sua família. Sempre que surgir um problema ou dúvida, você recebe orientação clara sobre seus direitos e próximos passos.",
      coverage: [
        "Direito do Consumidor (compras e serviços)",
        "Família (separação, guarda, pensão e acordos)",
        "Moradia e Imóveis (aluguel, compra, venda)",
        "Responsabilidade Civil (acidentes e indenizações)",
        "Contratos Abusivos e injustos com o consumidor."
      ]
    },
    {
      title: "Suporte no Bloqueio e Reativação de Conta",
      description: "Apoio para compreender o motivo do bloqueio e orientação nas etapas para solicitar reativação. Auxiliamos você a estruturar o pedido, organizar documentos e aumentar suas chances de retorno às plataformas.",
      coverage: [
        "Análise do caso e possível causa do bloqueio",
        "Orientação sobre documentos e prazos",
        "Modelos prontos de solicitação e recurso",
        "Orientação em cada fase do processo",
        "Estratégias para evitar novos bloqueios"
      ]
    },
    {
      title: "Gestão de Multas, Suspensão e Cassação da CNH",
      description: "Orientação para avaliar, contestar e recorrer multas — protegendo sua CNH e seu direito de trabalhar. Você recebe instruções claras sobre como agir, prazos, documentos e argumentos para aumentar as chances de sucesso.",
      coverage: [
        "Avaliação da multa e viabilidade de recurso",
        "Modelos de defesa prontos para uso",
        "Orientação em cada fase do processo",
        "Suspensão e cassação de CNH",
        "Boas práticas para evitar novas penalidades"
      ]
    }
  ];
  return <section id="services" className="py-16 md:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div 
          ref={headerRef}
          className={`
            max-w-3xl mx-auto text-center mb-12 md:mb-14
            transition-all duration-700 ease-out
            ${headerInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
            }
          `}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Sua <span className="text-primary">Cobertura</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Seja no carro ou na moto, oferecemos suporte jurídico completo em diversas áreas para quem roda de aplicativo de transporte ou entrega.</p>
        </div>

        <div 
          ref={cardsRef}
          className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto items-stretch"
        >
          {services.map((service, index) => (
            <div 
              key={index} 
              className={`
                bg-card rounded-xl border border-border hover:border-primary/50 
                transition-all duration-700 ease-out hover:shadow-lg flex flex-col overflow-hidden
                ${cardsInView 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-12'
                }
              `}
              style={{ 
                transitionDelay: `${index * 100}ms`,
                transitionProperty: 'opacity, transform'
              }}
            >
              {/* CAIXA SUPERIOR - Informações principais */}
              <div className="p-6 pb-5">
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {service.title}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
              
              {/* SEPARADOR */}
              <div className="border-t border-border/50"></div>
              
              {/* CAIXA INFERIOR - Benefícios */}
              <div className="p-6 pt-5 bg-muted/30">
                <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
                  Você conta com:
                </p>
                <ul className="space-y-2">
                  {service.coverage.map((item, idx) => (
                    <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/70 italic mt-8 max-w-4xl mx-auto">
          * Caso seja necessária representação por advogado, os honorários serão combinados previamente e com total transparência.
        </p>
      </div>
    </section>;
};
export default Services;