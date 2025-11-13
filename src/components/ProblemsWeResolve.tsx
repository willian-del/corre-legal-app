import { useInView } from "@/hooks/use-in-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const PROBLEMS_DATA = [
  {
    title: "Bloqueio Injusto no App",
    description: "Bloqueado sem explicação ou acusado injustamente? Te ajudamos a entender o motivo, montar pedido de reativação e voltar ao trabalho."
  },
  {
    title: "Compras, Devoluções e Golpes Online",
    description: "Produto errado, propaganda enganosa ou golpe? Ajudamos você a exigir direitos, pedir devolução e resolver problemas de consumo."
  },
  {
    title: "Multa Injusta ou Radar Irregular",
    description: "Multa em local mal sinalizado ou radar escondido? Avaliamos se cabe recurso e preparamos defesa para preservar dinheiro e pontos."
  },
  {
    title: "Acidente na Corrida ou Entrega",
    description: "Envolvido em acidente durante o trabalho? Te orientamos sobre direitos, como cobrar seguro ou indenização e resolver tudo corretamente."
  },
  {
    title: "Problemas com Aluguel de Carro ou Moto",
    description: "Cobrança abusiva ou contrato mal explicado no aluguel? Analisamos documentos, orientamos sobre legalidade e ajudamos na contestação."
  },
  {
    title: "Conta Bancária Bloqueada",
    description: "Banco travou sua conta após corrida ou pagamento? Explicamos o motivo, preparamos documentos e ajudamos a recuperar acesso ao dinheiro."
  },
  {
    title: "Compra/Venda de Veículo com Problema",
    description: "Veículo com defeito oculto, documento atrasado ou promessa não cumprida? Mostramos como exigir reparo, devolução ou ressarcimento legal."
  },
  {
    title: "Separação, Pensão ou Problemas de Família",
    description: "Questões de separação, guarda, pensão ou acordo? Damos orientação segura sobre direitos, próximos passos e resolução sem complicação."
  },
  {
    title: "Corrida com Cliente Problemático",
    description: "Cliente abusivo, reclamação injusta ou nota baixa sem motivo? Orientamos como responder, que provas reunir e como se proteger de penalidades."
  }
];

const ProblemsWeResolve = () => {
  const isMobile = useIsMobile();
  const { ref: headerRef, isInView: headerInView } = useInView();
  const { ref: cardsRef, isInView: cardsInView } = useInView();

  const renderCard = (problem: { title: string; description: string }, index: number) => (
    <Card className="p-3 hover:shadow-lg transition-all duration-300 min-h-[180px] flex flex-col">
      <div className="flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-bold text-foreground line-clamp-1">
          {problem.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
          {problem.description}
        </p>
      </div>
    </Card>
  );

  return (
    <section id="problems" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div
          ref={headerRef}
          className={`text-center mb-12 transition-all duration-700 ${
            headerInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Problemas que <span className="text-primary">Resolvemos</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Referência rápida de como podemos ajudar você no corre de todo dia
          </p>
        </div>

        <div ref={cardsRef}>
          {isMobile ? (
            <Carousel
              opts={{ align: "start", loop: true }}
              className="w-full"
            >
              <CarouselContent>
                {PROBLEMS_DATA.map((problem, index) => (
                  <CarouselItem key={index} className="basis-[85%]">
                    {renderCard(problem, index)}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
              {PROBLEMS_DATA.map((problem, index) => (
                <div
                  key={index}
                  className={`transition-all duration-700 ${
                    cardsInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{
                    transitionDelay: cardsInView ? `${index * 100}ms` : "0ms",
                  }}
                >
                  {renderCard(problem, index)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProblemsWeResolve;
