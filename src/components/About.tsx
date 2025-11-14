import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useInView } from "@/hooks/use-in-view";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

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
  const isMobile = useIsMobile();
  const { ref: headerRef, isInView: headerInView } = useInView({ 
    threshold: 0.2, 
    triggerOnce: true 
  });

  const { ref: cardsRef, isInView: cardsInView } = useInView({ 
    threshold: 0.15, 
    triggerOnce: true 
  });

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const renderCard = (card: { title: string; description: string }, index: number) => (
    <div 
      key={index}
      className={`
        bg-card rounded-2xl p-6 border border-border hover:border-primary/50 
        transition-all duration-700 ease-out hover:shadow-elevated
        ${cardsInView && !isMobile
          ? 'opacity-100 translate-y-0' 
          : !isMobile ? 'opacity-0 translate-y-12' : ''
        }
      `}
      style={!isMobile ? { 
        transitionDelay: `${index * 100}ms`,
        transitionProperty: 'opacity, transform',
        willChange: cardsInView ? 'auto' : 'opacity, transform'
      } : undefined}
    >
      <h3 className="text-xl font-bold mb-3 text-foreground">{card.title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {card.description}
      </p>
    </div>
  );

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
          className={`
            max-w-5xl mx-auto
            transition-all duration-700 ease-out
            ${cardsInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-12'
            }
          `}
        >
          {isMobile ? (
            <>
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
                setApi={setApi}
              >
                <CarouselContent>
                  {ABOUT_CARDS.map((card, index) => (
                    <CarouselItem key={index}>
                      {renderCard(card, index)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Dots indicadores */}
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all duration-300",
                      current === index 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30"
                    )}
                    onClick={() => api?.scrollTo(index)}
                    aria-label={`Ir para card ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {ABOUT_CARDS.map((card, index) => renderCard(card, index))}
            </div>
          )}
        </div>

      </div>
    </section>;
};
export default About;