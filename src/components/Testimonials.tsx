import { useState, useEffect } from "react";
import { Quote } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import carlosImg from "@/assets/testimonials/carlos.webp";
import fernandaImg from "@/assets/testimonials/fernanda.webp";
import marcaoImg from "@/assets/testimonials/marcao.webp";

const TESTIMONIALS_DATA = [
    {
      name: "Carlos",
      role: "Motorista há 3 anos",
      location: "São Paulo/SP",
      content: "Tive bloqueio na plataforma e o Corre Legal resolveu rapidinho. Voltei a trabalhar em menos de uma semana!",
      initials: "CS",
      image: carlosImg,
    },
    {
      name: "Fernanda",
      role: "Entregadora",
      location: "Belo Horizonte/MG",
      content: "Comprei um celular com defeito e a loja não queria trocar. O Corre Legal me orientou sobre meus direitos e consegui resolver.",
      initials: "FC",
      image: fernandaImg,
    },
    {
      name: "Marcão",
      role: "Motorista",
      location: "Recife/PE",
      content: "Levei uma multa injusta e o Corre Legal me ajudou a recorrer. Conseguimos reverter e agora sei que tenho pra quem correr!",
      initials: "MS",
      image: marcaoImg,
    },
  ];

const Testimonials = () => {
  const isMobile = useIsMobile();
  
  const { ref: headerRef, isInView: headerInView } = useInView({ 
    threshold: 0.2, 
    triggerOnce: true 
  });

  const { ref: carouselRef, isInView: carouselInView } = useInView({ 
    threshold: 0.1, 
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

  const renderCard = (testimonial: typeof TESTIMONIALS_DATA[0], index: number) => (
    <div 
      key={index}
      className={`
        bg-card rounded-2xl p-6 md:p-8 border border-border h-full
        transition-all duration-700 ease-out hover:border-primary/50 hover:shadow-lg
        ${carouselInView && !isMobile
          ? 'opacity-100 translate-y-0' 
          : !isMobile ? 'opacity-0 translate-y-12' : ''
        }
      `}
      style={!isMobile ? { 
        transitionDelay: `${index * 100}ms`,
        transitionProperty: 'opacity, transform',
        willChange: carouselInView ? 'auto' : 'opacity, transform'
      } : undefined}
    >
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Avatar className="h-12 w-12 md:h-14 md:w-14">
            <AvatarImage 
              src={testimonial.image} 
              alt={testimonial.name}
              loading="lazy"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {testimonial.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-foreground text-base md:text-lg">{testimonial.name}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{testimonial.role}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{testimonial.location}</p>
          </div>
        </div>
        <Quote className="w-8 h-8 md:w-10 md:h-10 text-primary/20 shrink-0" />
      </div>
      <p className="text-foreground leading-relaxed text-sm md:text-base italic">
        "{testimonial.content}"
      </p>
    </div>
  );

  return (
    <section id="testimonials" className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div 
          ref={headerRef}
          className={`
            max-w-3xl mx-auto text-center mb-12 md:mb-16
            transition-all duration-700 ease-out
            ${headerInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
            }
          `}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-foreground">
            Quem já roda com a <span className="text-primary">gente</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Veja como ajudamos profissionais como você a resolver suas questões jurídicas.
          </p>
        </div>

        <div 
          ref={carouselRef}
          className={`
            max-w-5xl mx-auto
            transition-all duration-700 ease-out
            ${carouselInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-12'
            }
          `}
          style={{ 
            willChange: carouselInView ? 'auto' : 'opacity, transform'
          }}
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
                  {TESTIMONIALS_DATA.map((testimonial, index) => (
                    <CarouselItem key={index}>
                      {renderCard(testimonial, index)}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              
              {/* Dots indicadores - apenas no mobile */}
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
                    aria-label={`Ir para depoimento ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS_DATA.map((testimonial, index) => renderCard(testimonial, index))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
