import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Motorista de App",
      content: "Fui bloqueado injustamente e o Corre Legal me ajudou a reverter a situação em poucos dias. Atendimento excelente!",
      rating: 5,
    },
    {
      name: "Ana Paula",
      role: "Entregadora",
      content: "Precisava de ajuda com uma multa indevida e fui atendida super rápido pelo WhatsApp. Resolveram tudo!",
      rating: 5,
    },
    {
      name: "Roberto Santos",
      role: "Motorista de App",
      content: "O apoio jurídico do Corre Legal me deu a tranquilidade que eu precisava. Preço justo e profissionais competentes.",
      rating: 5,
    },
    {
      name: "Juliana Costa",
      role: "Entregadora",
      content: "Estava com problemas no divórcio e eles me orientaram perfeitamente. Muito obrigada por todo suporte!",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Quem já roda com a <span className="text-primary">gente</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Veja como ajudamos profissionais como você a resolver suas questões jurídicas.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                  <div className="bg-card rounded-2xl p-8 border border-border h-full">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground leading-relaxed mb-6 text-lg">
                      "{testimonial.content}"
                    </p>
                    <div className="border-t border-border pt-4">
                      <p className="font-bold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
