import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PixPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    amount: number;
    payment_id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const planType = searchParams.get("plan");
    const amount = searchParams.get("amount");
    const coupon = searchParams.get("coupon");

    if (!planType || !amount) {
      toast({
        title: "Erro",
        description: "Informações do pagamento não encontradas",
        variant: "destructive",
      });
      navigate("/checkout");
      return;
    }

    createPixPayment(planType, parseFloat(amount), coupon || null);
  }, [searchParams]);

  const createPixPayment = async (planType: string, amount: number, couponCode: string | null) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: { 
          plan_type: planType, 
          amount,
          coupon_code: couponCode 
        },
      });

      if (error) throw error;

      if (data.success) {
        setPixData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          amount: data.amount,
          payment_id: data.payment_id,
        });
      } else {
        throw new Error(data.error || "Erro ao criar pagamento PIX");
      }
    } catch (error) {
      console.error("Error creating PIX payment:", error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Não foi possível gerar o código PIX. Tente novamente.",
        variant: "destructive",
      });
      navigate("/checkout");
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento para concluir.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Gerando código PIX...</p>
        </div>
      </div>
    );
  }

  if (!pixData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Pagamento <span className="text-primary">PIX</span>
            </h1>
            <p className="text-muted-foreground">
              Escaneie o QR Code ou copie o código para pagar
            </p>
          </div>

          {/* Payment Info */}
          <div className="bg-card rounded-2xl p-8 border border-border mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Valor a pagar</p>
            <p className="text-4xl font-bold text-primary mb-6">
              R$ {pixData.amount.toFixed(2).replace(".", ",")}
            </p>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-xl inline-block mb-6">
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="w-64 h-64"
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ou copie o código PIX abaixo:
              </p>

              {/* PIX Code */}
              <div className="bg-muted/50 rounded-xl p-4 break-all text-sm font-mono">
                {pixData.qr_code}
              </div>

              {/* Copy Button */}
              <Button
                onClick={copyPixCode}
                className="w-full gap-2"
                size="lg"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copiar Código PIX
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/30 rounded-2xl p-6 border border-border">
            <h3 className="font-semibold mb-4">Como pagar com PIX:</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">1.</span>
                <span>Abra o app do seu banco ou carteira digital</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">2.</span>
                <span>Escolha pagar com PIX QR Code ou PIX Copia e Cola</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">3.</span>
                <span>Escaneie o QR Code ou cole o código copiado</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">4.</span>
                <span>Confirme o pagamento e pronto!</span>
              </li>
            </ol>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Após a confirmação do pagamento, sua assinatura será ativada automaticamente.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PixPayment;
