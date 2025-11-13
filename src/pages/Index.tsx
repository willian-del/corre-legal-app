import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProblemsWeResolve from "@/components/ProblemsWeResolve";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Auto-checkout após signup/login
  useEffect(() => {
    const handleAutoCheckout = async () => {
      const checkoutParam = searchParams.get('checkout');
      const planParam = searchParams.get('plan');
      
      if (checkoutParam === 'true' && planParam && user) {
        // Limpar parâmetros da URL
        setSearchParams({});
        
        // Aguardar um momento para garantir que a página carregou
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Rolar até a seção de pricing
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Aguardar scroll completar
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Invocar checkout automaticamente
        try {
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: { plan_type: planParam }
          });
          
          if (error) throw error;
          
          if (data?.url) {
            window.open(data.url, '_blank');
            toast.success('Checkout aberto! Complete o pagamento na nova janela.');
          }
        } catch (error) {
          console.error('Erro ao abrir checkout:', error);
          toast.error('Erro ao abrir checkout. Por favor, tente novamente.');
        }
      }
    };
    
    handleAutoCheckout();
  }, [searchParams, user, setSearchParams]);

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
