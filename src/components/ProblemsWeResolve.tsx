import { useInView } from "@/hooks/use-in-view";
import { Card } from "@/components/ui/card";
import { 
  ShieldAlert, 
  ShoppingBag, 
  AlertCircle, 
  Car, 
  KeyRound, 
  CreditCard, 
  Wrench, 
  Users 
} from "lucide-react";

const PROBLEMS_DATA = [
  {
    icon: ShieldAlert,
    title: "Bloqueio Injusto no App",
    description: "Foi bloqueado sem explicação? Te acusaram de algo que você não fez? A gente te ajuda a entender o motivo, montar o pedido de reativação e aumentar suas chances de voltar a trabalhar rápido."
  },
  {
    icon: ShoppingBag,
    title: "Problemas com Compras, Devoluções e Golpes",
    description: "Comprou algo pela internet e veio errado? Propaganda enganosa? Caiu em golpe de marketplace? Ajudamos você a exigir seus direitos, pedir devolução, contestar cobranças e resolver situações de consumo do dia a dia."
  },
  {
    icon: AlertCircle,
    title: "Multa Injusta ou Radar Irregular",
    description: "Levou multa em rua mal sinalizada? Radar escondido? Avaliamos se dá para recorrer e preparamos a defesa para você não perder dinheiro nem pontos na CNH."
  },
  {
    icon: Car,
    title: "Acidente Durante a Corrida ou Entrega",
    description: "Bateu o carro ou a moto? Foi atingido por outro veículo? Te ajudamos a entender seus direitos, cobrar seguro/indenização e resolver o caso do jeito certo."
  },
  {
    icon: KeyRound,
    title: "Problemas com Aluguel de Carro ou Moto",
    description: "Cobrança indevida? Desconto abusivo? Contrato mal explicado? Analisamos o contrato, orientamos o que é legal e te mostramos como contestar a cobrança."
  },
  {
    icon: CreditCard,
    title: "Conta Bancária Bloqueada Após Pix ou Depósito",
    description: "O banco travou sua conta depois de uma corrida ou pagamento? Explicamos o motivo, preparamos o pedido de desbloqueio e ajudamos você a recuperar o acesso ao dinheiro."
  },
  {
    icon: Wrench,
    title: "Compra ou Venda de Moto/Carro com Problema",
    description: "Veículo com defeito oculto, documento atrasado ou promessa que não foi cumprida? Te mostramos como exigir reparo, devolução ou ressarcimento — tudo dentro da lei."
  },
  {
    icon: Users,
    title: "Separação, Pensão ou Problemas de Família",
    description: "Separação, guarda de filhos, pensão ou acordo malfeito? Damos orientação segura para você saber seus direitos, próximos passos e como resolver sem dor de cabeça."
  }
];

const ProblemsWeResolve = () => {
  const { ref: headerRef, isInView: headerInView } = useInView();
  const { ref: cardsRef, isInView: cardsInView } = useInView();

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

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {PROBLEMS_DATA.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Card
                key={index}
                className={`p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  cardsInView
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: cardsInView ? `${index * 100}ms` : "0ms",
                }}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProblemsWeResolve;
