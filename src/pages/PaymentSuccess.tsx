import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-2xl p-8 shadow-elevated border border-border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-muted-foreground text-lg mb-6">
            Seu plano está ativo e você tem acesso por <strong>6 meses</strong> de cobertura jurídica completa.
          </p>
          
          <div className="bg-secondary/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>📧 Verifique seu email!</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Enviamos suas credenciais de acesso para o email cadastrado no pagamento.
              Use essas credenciais para fazer login e acessar sua área de cliente.
            </p>
          </div>

          <Button
            onClick={() => navigate("/auth")}
            className="w-full"
            size="lg"
          >
            Fazer Login
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full mt-3"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
