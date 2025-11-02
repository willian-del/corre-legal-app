const Services = () => {
  const services = [
    {
      title: "Canal de Atendimento Jurídico",
      description: "Orientação jurídica especializada para as principais situações do seu dia a dia — dentro e fora dos apps, para você e sua família. Sempre que surgir um problema ou dúvida, você recebe orientação clara sobre seus direitos e próximos passos."
    },
    {
      title: "Bloqueio e Reativação de Conta",
      description: "Apoio para compreender o motivo do bloqueio e orientação nas etapas para solicitar reativação. Auxiliamos você a estruturar o pedido, organizar documentos e aumentar suas chances de retorno às plataformas."
    },
    {
      title: "Gestão de Multas e Problemas com a CNH",
      description: "Orientação para avaliar, contestar e recorrer multas — protegendo sua CNH e seu direito de trabalhar. Você recebe instruções claras sobre como agir, prazos, documentos e argumentos para aumentar as chances de sucesso."
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

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto items-stretch">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              {/* Título */}
              <h3 className="text-xl font-bold mb-2 text-foreground">
                {service.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
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