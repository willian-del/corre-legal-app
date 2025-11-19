import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProblemsWeResolve from "@/components/ProblemsWeResolve";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

const Index = () => {
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
