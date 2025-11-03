import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-in fade-in duration-500">
        <Badge variant="default" className="mb-4 shadow-glow">
          Sucesso
        </Badge>
        <div className="bg-gradient-to-b from-card to-card/50 rounded-2xl p-8 shadow-elevated border border-primary/20">
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto shadow-glow">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground mb-4">
                Seu plano foi ativado com sucesso
              </p>
            </div>

            <div className="bg-gradient-to-br from-secondary/50 to-secondary/30 border border-primary/30 rounded-lg p-4">
              <p className="text-sm text-primary mb-2 font-semibold">
                Próximos passos:
              </p>
              <ol className="text-sm text-muted-foreground text-left space-y-2 max-w-md mx-auto">
                <li>1. Se esta é sua primeira compra, verifique seu email para receber suas credenciais de acesso</li>
                <li>2. Faça login na área de cliente</li>
                <li>3. Complete seu cadastro com CPF e telefone (apenas no primeiro acesso)</li>
                <li>4. Aproveite todos os benefícios do seu plano!</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="shadow-glow hover:shadow-glow"
              >
                Fazer Login
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
                className="border-primary/30 hover:bg-primary/10"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
