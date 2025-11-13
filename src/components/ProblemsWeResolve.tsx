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
    description: "Foi bloqueado sem explicação? Te acusaram de algo que você não fez? A gente te ajuda a entender o motivo, montar o pedido de reativação e aumentar suas chances de voltar a trabalhar rápido."
  },
  {
    title: "Problemas com Compras, Devoluções e Golpes",
    description: "Comprou algo pela internet e veio errado? Propaganda enganosa? Caiu em golpe de marketplace? Ajudamos você a exigir seus direitos, pedir devolução, contestar cobranças e resolver situações de consumo do dia a dia."
  },
  {
    title: "Multa Injusta ou Radar Irregular",
    description: "Levou multa em rua mal sinalizada? Radar escondido? Avaliamos se dá para recorrer e preparamos a defesa para você não perder dinheiro nem pontos na CNH."
  },
  {
    title: "Acidente Durante a Corrida ou Entrega",
    description: "Bateu o carro ou a moto? Foi atingido por outro veículo? Te ajudamos a entender seus direitos, cobrar seguro/indenização e resolver o caso do jeito certo."
  },
  {
    title: "Problemas com Aluguel de Carro ou Moto",
    description: "Cobrança indevida? Desconto abusivo? Contrato mal explicado? Analisamos o contrato, orientamos o que é legal e te mostramos como contestar a cobrança."
  },
  {
    title: "Conta Bancária Bloqueada Após Pix ou Depósito",
    description: "O banco travou sua conta depois de uma corrida ou pagamento? Explicamos o motivo, preparamos o pedido de desbloqueio e ajudamos você a recuperar o acesso ao dinheiro."
  },
  {
    title: "Compra ou Venda de Moto/Carro com Problema",
    description: "Veículo com defeito oculto, documento atrasado ou promessa que não foi cumprida? Te mostramos como exigir reparo, devolução ou ressarcimento — tudo dentro da lei."
  },
  {
    title: "Separação, Pensão ou Problemas de Família",
    description: "Separação, guarda de filhos, pensão ou acordo malfeito? Damos orientação segura para você saber seus direitos, próximos passos e como resolver sem dor de cabeça."
  }
];

const ProblemsWeResolve = () => {
  const isMobile = useIsMobile();
  const { ref: headerRef, isInView: headerInView } = useInView();
  const { ref: cardsRef, isInView: cardsInView } = useInView();

  const renderCard = (problem: { title: string; description: string }, index: number) => (
    <Card className="p-3 hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
