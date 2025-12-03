import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-image.webp";

const Hero = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-16">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Motorista de aplicativo" 
          loading="eager" 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{
            objectPosition: "center"
          }} 
        />
        <div 
          className="absolute inset-0" 
          style={{
            background: theme === "light" 
              ? "linear-gradient(to right, hsl(0 0% 100% / 0.85), hsl(0 0% 100% / 0.6))"
              : "linear-gradient(to right, hsl(240 10% 8% / 0.95), hsl(240 10% 8% / 0.7))"
          }} 
        />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${
            theme === "light" ? "text-gray-900" : "text-white"
          }`}>
            Seu parceiro legal para o <span className="text-primary">corre de todo dia</span>
          </h1>
          <p className={`text-xl md:text-2xl mb-8 leading-relaxed ${
            theme === "light" ? "text-gray-700" : "text-white/80"
          }`}>
            Plano de Acolhimento Jurídico para motoristas de aplicativo e entregadores
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth?signup=true')} 
            className="bg-primary text-primary-foreground hover:bg-primary-glow text-lg px-8 py-6 shadow-glow button-glow-pulse"
          >
            Cadastre-se Agora
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
