import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";
const Hero = () => {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <section id="home" className="relative min-h-screen flex items-center pt-16">
      <div className="absolute inset-0 z-0" style={{
      backgroundImage: `linear-gradient(to right, hsl(240 10% 8% / 0.95), hsl(240 10% 8% / 0.7)), url(${heroImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground leading-tight">
            Seu parceiro legal para o <span className="text-primary">corre de todo dia</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">Acolhimento jurídico para motoristas de aplicativo e entregadores</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={scrollToContact} className="bg-primary text-primary-foreground hover:bg-primary-glow text-lg px-8 py-6 shadow-glow">
              Contrate Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
            const element = document.getElementById("services");
            if (element) {
              element.scrollIntoView({
                behavior: "smooth"
              });
            }
          }} className="text-lg px-8 py-6 border-primary/30 hover:border-primary hover:bg-primary/10">
              Conheça os Serviços
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;