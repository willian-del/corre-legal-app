import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const planType = searchParams.get("plan") || "monthly";
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      navigate(`/auth?signup=true&checkout=true&plan=${planType}`);
      return;
    }

    // Initialize Mercado Pago and create preference
    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      createPreference();
    }
  }, [user, planType]);

  const createPreference = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-mercadopago-preference", {
        body: { plan_type: planType },
      });

      if (error) throw error;

      if (data?.preference_id) {
        setPreferenceId(data.preference_id);
        // Initialize Checkout Bricks after getting preference ID
        renderCheckoutBricks(data.preference_id);
      } else {
        throw new Error("No preference ID received");
      }
    } catch (error: any) {
      console.error("Error creating preference:", error);
      toast({
        title: "Erro ao iniciar pagamento",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCheckoutBricks = async (prefId: string) => {
    try {
      const mp = (window as any).MercadoPago;
      if (!mp) return;

      const bricksBuilder = mp.bricks();

      await bricksBuilder.create("wallet", "checkout-container", {
        initialization: {
          preferenceId: prefId,
        },
        customization: {
          texts: {
            action: "pay",
            valueProp: "security_details",
          },
        },
      });
    } catch (error) {
      console.error("Error rendering checkout:", error);
    }
  };

  const getPlanDetails = () => {
    const plans = {
      monthly: {
        name: "Plano Mensal",
        price: "R$ 39,90",
        description: "Cobertura completa por 30 dias",
      },
      quarterly: {
        name: "Plano Trimestral",
        price: "R$ 99,90",
        description: "Cobertura completa por 90 dias",
      },
      annual: {
        name: "Plano Anual",
        price: "R$ 349,90",
        description: "Cobertura completa por 365 dias",
      },
    };
    return plans[planType as keyof typeof plans] || plans.monthly;
  };

  const plan = getPlanDetails();

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
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Finalize sua <span className="text-primary">Assinatura</span>
            </h1>
            <p className="text-muted-foreground">Você está contratando o {plan.name}</p>
          </div>

          {/* Plan Summary */}
          <div className="bg-card rounded-2xl p-6 border border-border mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{plan.price}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">{plan.price}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-6">Pagamento</h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Preparando pagamento...</p>
              </div>
            ) : preferenceId ? (
              <div className="space-y-4">
                <div id="checkout-container" ref={checkoutRef}></div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Não foi possível carregar o pagamento</p>
                <Button onClick={createPreference} variant="outline">
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>🔒 Pagamento seguro processado pelo Mercado Pago</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
