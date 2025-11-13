import { Card, CardContent } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";

const ABOUT_CARDS = [
  {
    title: "Suporte Jurídico",
    description: "Defendemos seus direitos com expertise jurídica especializada para profissionais de aplicativos.",
  },
  {
    title: "Atendimento Humano",
    description: "Advogados especialistas te ajudam a resolver o problema com quem entende sua rotina.",
  },
  {
    title: "Resposta Rápida",
    description: "Atendimento ágil via WhatsApp, porque entendemos que seu tempo é precioso.",
  },
];

const About = () => {
  const { ref: headerRef, isInView: headerInView } = useInView({ 
    threshold: 0.2, 
    triggerOnce: true 
  });

  const { ref: cardsRef, isInView: cardsInView } = useInView({ 
    threshold: 0.15, 
    triggerOnce: true 
  });

  return <section id="about" className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div 
          ref={headerRef}
          className={`
            max-w-3xl mx-auto text-center mb-16
            transition-all duration-700 ease-out
            ${headerInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
            }
          `}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Sobre o <span className="text-primary">Corre Legal</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Trabalhar na rua é viver na correria. A cada corrida ou entrega, imprevisto é o que não falta. A gente sabe como é — O Corre Legal nasceu pra isso: ser o parceiro para resolver os perrengues do corre com agilidade, preço justo e gente que entende sua rotina.</p>
        </div>

        <div 
          ref={cardsRef}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {ABOUT_CARDS.map((card, index) => (
            <div 
              key={index}
              className={`
                bg-card rounded-2xl p-6 border border-border hover:border-primary/50 
                transition-all duration-700 ease-out hover:shadow-elevated
                ${cardsInView 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-12'
                }
              `}
              style={{ 
                transitionDelay: `${index * 100}ms`,
                transitionProperty: 'opacity, transform',
                willChange: cardsInView ? 'auto' : 'opacity, transform'
              }}
            >
              <h3 className="text-xl font-bold mb-3 text-foreground">{card.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>;
};
export default About;