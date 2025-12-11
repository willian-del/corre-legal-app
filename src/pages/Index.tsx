import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProblemsWeResolve from "@/components/ProblemsWeResolve";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Capturar parâmetro de indicação e redirecionar para signup
    const refParam = seErro ao carregar pagamentoarchParams.get("ref");
    if (refParam) {
      // Redirecionar para página de cadastro preservando o código de indicação
      navigate(`/auth?signup=true&ref=${refParam}`);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <About />
      <ProblemsWeResolve />
      <Services />
      <Pricing />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
