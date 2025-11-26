import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.webp";
const Hero = () => {
  const scrollToPricing = () => {
    const element = document.getElementById("pricing");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  return <section id="home" className="relative min-h-screen flex items-center pt-16">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img src={heroImage} alt="Motorista de aplicativo" loading="eager" className="absolute inset-0 w-full h-full object-cover" style={{
        objectPosition: "center"
      }} />
        <div className="absolute inset-0" style={{
        background: "linear-gradient(to right, hsl(240 10% 8% / 0.95), hsl(240 10% 8% / 0.7))"
      }} />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
            Seu parceiro legal para o <span className="text-primary">corre de todo dia</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">Plano de Acolhimento Jurídico para motoristas de aplicativo
e entregadores</p>
          <Button size="lg" onClick={scrollToPricing} className="bg-primary text-primary-foreground hover:bg-primary-glow text-lg px-8 py-6 shadow-glow button-glow-pulse">
            Contrate Agora
          </Button>
        </div>
      </div>
    </section>;
};
export default Hero;