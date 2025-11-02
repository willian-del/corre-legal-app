const Services = () => {
  const services = [
    {
      title: "Suporte Jurídico do Corre",
      description: "Orientação jurídica especializada para as principais situações do seu dia a dia — dentro e fora dos apps, para você e sua família.",
      details: "Sempre que surgir um problema ou dúvida, você recebe orientação clara sobre seus direitos, próximos passos e como agir de forma correta e segura.",
      coverage: [
        "Direito do Consumidor (cobranças, compras, golpes, serviços e bancos)",
        "Família (separação, guarda, pensão e acordos)",
        "Herança e Inventário",
        "Moradia e Imóveis (aluguel, compra, venda e contratos)",
        "Contratos em geral",
        "Responsabilidade Civil (acidentes e indenizações)",
        "Orientação jurídica estendida para familiares diretos"
      ],
      disclaimer: "Caso seja necessária representação por advogado, os honorários serão combinados previamente e com total transparência."
    },
    {
      title: "Bloqueio e Reativação de Conta",
      description: "Apoio para compreender o motivo do bloqueio e orientação nas etapas para solicitar reativação.",
      details: "Auxiliamos você a estruturar o pedido, organizar documentos e aumentar suas chances de retorno às plataformas.",
      coverage: [
        "Análise do caso e possível causa do bloqueio",
        "Orientação sobre documentos, mensagens e prazos",
        "Modelos prontos de solicitação e recurso",
        "Acompanhamento até a conclusão do processo"
      ],
      disclaimer: "Caso seja necessária representação por advogado, os honorários serão combinados previamente e com total transparência."
    },
    {
      title: "Gestão e Defesa de Multas",
      description: "Orientação para avaliar, contestar e recorrer multas — protegendo sua CNH e seu direito de trabalhar.",
      details: "Você recebe instruções claras sobre como agir, prazos, documentos e argumentos para aumentar as chances de sucesso no recurso.",
      coverage: [
        "Avaliação da multa e análise de viabilidade de recurso",
        "Modelos de defesa prontos para uso",
        "Orientação passo a passo em cada fase do processo",
        "Suspensão e cassação de CNH",
        "Boas práticas para evitar novas penalidades"
      ],
      disclaimer: "Caso seja necessária representação por advogado, os honorários serão combinados previamente e com total transparência."
    }
  ];
  return <section id="services" className="py-16 md:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-14">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Sua <span className="text-primary">Cobertura</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Seja no carro ou na moto, oferecemos suporte jurídico completo em diversas áreas para quem roda de aplicativo de transporte ou entrega.</p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 md:p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              {/* Header */}
              <h3 className="text-2xl font-bold mb-3 text-foreground">
                {service.title}
              </h3>
              
              {/* Description */}
              <p className="text-base text-muted-foreground mb-2 leading-relaxed">
                {service.description}
              </p>
              
              {/* Details */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {service.details}
              </p>
              
              {/* Coverage List */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Cobre apoio e orientação em:
                </p>
                <ul className="space-y-1.5">
                  {service.coverage.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground/70 italic border-t border-border pt-3 mt-4">
                {service.disclaimer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>;
};
export default Services;