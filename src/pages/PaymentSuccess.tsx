import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-2xl p-8 shadow-elevated border border-border">
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground mb-4">
                Seu plano foi ativado com sucesso
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Próximos passos:</strong>
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 text-left space-y-2 max-w-md mx-auto">
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
              >
                Fazer Login
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
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
