import { Shield, Heart, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
const About = () => {
  return <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Sobre o <span className="text-primary">Corre Legal</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Trabalhar na rua é viver na correria. A cada corrida ou entrega, imprevisto é o que não falta. A gente sabe como é — O Corre Legal nasceu pra isso: ser o parceiro que te ajuda a resolver os perrengues do corre com agilidade, preço justo e gente que entende sua rotina.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Suporte Jurídico</h3>
            <p className="text-muted-foreground leading-relaxed">
              Defendemos seus direitos com expertise jurídica especializada para profissionais de aplicativos.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
              <Heart className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Atendimento Humano</h3>
            <p className="text-muted-foreground leading-relaxed">
              Tratamos cada caso com empatia e compreensão, porque sabemos o valor do seu trabalho.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-elevated">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Resposta Rápida</h3>
            <p className="text-muted-foreground leading-relaxed">
              Atendimento ágil via WhatsApp, porque entendemos que seu tempo é precioso.
            </p>
          </div>
        </div>

      </div>
    </section>;
};
export default About;