import { Scale, Home, Heart, Coins, FileText, Shield, Car, Smartphone } from "lucide-react";
const Services = () => {
  const services = [{
    icon: Scale,
    title: "Direito do Consumidor",
    description: "Proteção contra cobranças indevidas, defeitos em produtos e serviços."
  }, {
    icon: Home,
    title: "Propriedade e Moradia",
    description: "Questões de aluguel, compra, venda e regularização de imóveis."
  }, {
    icon: Heart,
    title: "Divórcio e Pensão",
    description: "Orientação em separações, guarda de filhos e pensão alimentícia."
  }, {
    icon: Coins,
    title: "Herança e Sucessão",
    description: "Inventários, partilhas e questões relacionadas a heranças."
  }, {
    icon: Shield,
    title: "Responsabilidade Civil",
    description: "Acidentes, danos materiais e morais, indenizações."
  }, {
    icon: FileText,
    title: "Contratos",
    description: "Análise e elaboração de contratos diversos para sua segurança."
  }, {
    icon: Car,
    title: "Questões Veiculares",
    description: "Multas, documentação, despachante e CNH."
  }, {
    icon: Smartphone,
    title: "Bloqueios em Apps",
    description: "Assistência em bloqueios e suspensões em plataformas de trabalho."
  }];
  return <section id="services" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Nossos <span className="text-primary">Serviços</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Seja no carro ou na moto, oferecemos suporte jurídico completo em diversas áreas para quem roda de aplicativo de transporte ou entrega.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => {
          const Icon = service.icon;
          return <div key={index} className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>;
        })}
        </div>

        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border border-primary/20">
            <h3 className="text-2xl font-bold mb-4 text-foreground text-center">Planos Acessíveis</h3>
            <p className="text-lg text-muted-foreground text-center leading-relaxed mb-6">
              Desenvolvemos planos sob medida para atender suas necessidades jurídicas com mensalidades que cabem no seu bolso.
            </p>
            <div className="flex justify-center">
              <button onClick={() => {
              const element = document.getElementById("contact");
              if (element) {
                element.scrollIntoView({
                  behavior: "smooth"
                });
              }
            }} className="bg-primary text-primary-foreground hover:bg-primary-glow px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-glow">
                Consultar Planos
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Services;