import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { checkActiveSubscription } from "@/lib/subscription-utils";
import Logo from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const isActive = await checkActiveSubscription(user.id);
        setHasActiveSubscription(isActive);
      } else {
        setHasActiveSubscription(null);
      }
    };

    checkSubscription();
  }, [user]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  const handleMeuCorre = () => {
    if (user) {
      navigate('/meu-corre');
    } else {
      navigate('/auth');
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Logo size={48} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-bold text-foreground">Corre Legal</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Button
              onClick={handleMeuCorre}
              variant="ghost"
              size="default"
              className="gap-2 h-10"
            >
              <User size={18} />
              Meu Corre
            </Button>
            {!user ? (
              <Button
                onClick={() => navigate('/auth?signup=true')}
                size="default"
                className="bg-primary text-primary-foreground hover:bg-primary-glow h-10 button-glow-pulse"
              >
                Cadastre-se Agora
              </Button>
            ) : hasActiveSubscription === false ? (
              <Button
                onClick={() => navigate('/meu-corre')}
                size="default"
                className="bg-primary text-primary-foreground hover:bg-primary-glow h-10 button-glow-pulse"
              >
                Contrate Agora
              </Button>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <div className="flex justify-center pb-4">
              <ThemeToggle />
            </div>
            <Button
              onClick={handleMeuCorre}
              variant="ghost"
              size="default"
              className="w-full gap-2 h-10"
            >
              <User size={18} />
              Meu Corre
            </Button>
            {!user ? (
              <Button
                onClick={() => navigate('/auth?signup=true')}
                size="default"
                className="w-full bg-primary text-primary-foreground hover:bg-primary-glow h-10 button-glow-pulse"
              >
                Cadastre-se Agora
              </Button>
            ) : hasActiveSubscription === false ? (
              <Button
                onClick={() => navigate('/meu-corre')}
                size="default"
                className="w-full bg-primary text-primary-foreground hover:bg-primary-glow h-10 button-glow-pulse"
              >
                Contrate Agora
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
