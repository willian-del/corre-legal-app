import { Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import carlosImg from "@/assets/testimonials/carlos.jpg";
import fernandaImg from "@/assets/testimonials/fernanda.jpg";
import marcaoImg from "@/assets/testimonials/marcao.jpg";

const Testimonials = () => {
  const testimonials = [
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
      content: "Precisei regularizar minha documentação e fui super bem atendida pelo WhatsApp. Os advogados explicam tudo direitinho!",
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
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="bg-card rounded-2xl p-8 border border-border h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={testimonial.image} alt={testimonial.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground text-lg">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                        </div>
                      </div>
                      <Quote className="w-10 h-10 text-primary/20 shrink-0" />
                    </div>
                    <p className="text-foreground leading-relaxed text-base italic">
                      "{testimonial.content}"
                    </p>
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
