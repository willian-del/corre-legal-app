const Services = () => {
  const services = [{
    title: "Direito do Consumidor",
    description: "Proteção contra cobranças indevidas, defeitos em produtos e serviços."
  }, {
    title: "Propriedade e Moradia",
    description: "Questões de aluguel, compra, venda e regularização de imóveis."
  }, {
    title: "Divórcio e Pensão",
    description: "Orientação em separações, guarda de filhos e pensão alimentícia."
  }, {
    title: "Herança e Sucessão",
    description: "Inventários, partilhas e questões relacionadas a heranças."
  }, {
    title: "Responsabilidade Civil",
    description: "Acidentes, danos materiais e morais, indenizações."
  }, {
    title: "Contratos",
    description: "Análise e elaboração de contratos diversos para sua segurança."
  }, {
    title: "Questões Veiculares",
    description: "Multas, documentação, despachante e CNH."
  }, {
    title: "Bloqueios em Apps",
    description: "Assistência em bloqueios e suspensões em plataformas de trabalho."
  }];
  return <section id="services" className="py-16 md:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-14">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Sua <span className="text-primary">Cobertura</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Seja no carro ou na moto, oferecemos suporte jurídico completo em diversas áreas para quem roda de aplicativo de transporte ou entrega.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {services.map((service, index) => {
          return <div key={index} className="bg-card rounded-xl p-4 md:p-5 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
                <h3 className="text-lg font-bold mb-1.5 text-foreground">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-snug">
                  {service.description}
                </p>
              </div>;
        })}
        </div>
      </div>
    </section>;
};
export default Services;