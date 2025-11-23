import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Tag } from "lucide-react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import plansConfig from "@/config/plans.json";
import couponsConfig from "@/config/coupons.json";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const planType = searchParams.get("plan") || "monthly";
  const couponCode = searchParams.get("coupon")?.toUpperCase();
  const [initialization, setInitialization] = useState<any>(null);

  // Get coupon details
  const coupon = couponCode ? couponsConfig[couponCode as keyof typeof couponsConfig] : null;
  const isCouponValid = coupon && coupon.active && new Date(coupon.validUntil) >= new Date();

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      navigate(`/auth?signup=true&checkout=true&plan=${planType}`);
      return;
    }

    // Initialize Mercado Pago
    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
    }

    // Create payment preference and initialization
    const createPreference = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("create-mercadopago-preference", {
          body: {
            plan_type: planType,
            amount: finalPrice,
            coupon_code: couponCode || null,
          },
        });

        if (error) {
          console.error("Error creating preference:", error);
          toast({
            title: "Erro ao preparar pagamento",
            description: "Não foi possível preparar o checkout. Tente novamente.",
            variant: "destructive",
          });
          return;
        }

        if (data?.preference_id) {
          setInitialization({
            amount: finalPrice,
            preferenceId: data.preference_id,
          });
        }
      } catch (error) {
        console.error("Error in createPreference:", error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao preparar o pagamento.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    createPreference();
  }, [user, planType, toast, navigate]);

  const plan = plansConfig[planType as keyof typeof plansConfig] || plansConfig.monthly;

  // Calculate discount
  const calculateDiscount = () => {
    if (!isCouponValid || !coupon) return 0;

    if (coupon.discountType === "percentage") {
      return (plan.price * coupon.discountValue) / 100;
    } else {
      return coupon.discountValue;
    }
  };

  const discount = calculateDiscount();
  const finalPrice = Math.max(0, plan.price - discount);

  const handlePaymentSubmit = async (paymentData: any) => {
    console.log("Payment data:", paymentData);

    try {
      // If payment method is PIX, redirect to PIX payment page
      if (paymentData.paymentType === "bank_transfer") {
        navigate(`/pix-payment?plan=${planType}&amount=${finalPrice}&coupon=${couponCode || ""}`);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          paymentData: paymentData,
          planType: planType,
          amount: finalPrice,
          couponCode: couponCode || null,
          paymentMethod: paymentData.paymentType,
        },
      });

      if (error) {
        console.error("Error processing payment:", error);
        toast({
          title: "Erro ao processar pagamento",
          description: "Não foi possível processar seu pagamento. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data?.success) {
        toast({
          title: "Pagamento aprovado!",
          description: "Sua assinatura foi ativada com sucesso.",
        });
        navigate("/payment-success");
      } else {
        toast({
          title: "Pagamento não aprovado",
          description: data?.error || "O pagamento não foi aprovado. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in handlePaymentSubmit:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error("Payment error:", error);
    toast({
      title: "Erro no pagamento",
      description: "Ocorreu um erro ao processar o pagamento. Tente novamente.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
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
                <p
                  className={`text-2xl font-bold ${discount > 0 ? "line-through text-muted-foreground" : "text-primary"}`}
                >
                  {plan.displayPrice}
                </p>
              </div>
            </div>

            {/* Coupon Applied */}
            {isCouponValid && coupon && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">Cupom Aplicado!</span>
                </div>
                <p className="text-sm text-foreground/80 mb-2">
                  {coupon.name}: {coupon.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Desconto:</span>
                  <span className="text-lg font-bold text-primary">
                    -{" "}
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `R$ ${discount.toFixed(2).replace(".", ",")}`}
                  </span>
                </div>
              </div>
            )}

            {/* Invalid Coupon Warning */}
            {couponCode && !isCouponValid && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive">Cupom inválido ou expirado</span>
                </div>
                <p className="text-sm text-foreground/80 mt-1">O cupom "{couponCode}" não é válido ou já expirou.</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">R$ {finalPrice.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-semibold mb-6">Pagamento</h2>

            {loading || !initialization ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Preparando pagamento...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Payment
                  initialization={initialization}
                  onSubmit={handlePaymentSubmit}
                  onError={handlePaymentError}
                  locale="pt-BR"
                  customization={{
                    paymentMethods: {
                      maxInstallments: 10,
                      bankTransfer: ["all"],
                      creditCard: ["all"],
                    },
                  }}
                />
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
