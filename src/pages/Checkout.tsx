import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowLeft, Tag, RefreshCw, QrCode } from "lucide-react";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { TransparentCheckoutForm } from "@/components/checkout/TransparentCheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import plansConfig from "@/config/plans.json";
import couponsConfig from "@/config/coupons.json";
import { PLAN_DETAILS } from "@/lib/plans-config";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Initialize Mercado Pago SDK once at module level
const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

if (publicKey) {
  console.log("[CHECKOUT] Initializing Mercado Pago SDK at module level...");
  initMercadoPago(publicKey, { locale: "pt-BR" });
}


const validPlanTypes = Object.keys(PLAN_DETAILS);

export const Checkout = () => {
  console.log('[Checkout]');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // Removed useToast() hook cause it triggers re-renders on global toast state changes
  const [loading, setLoading] = useState(false);
  const planType = searchParams.get("plan") || "quarterly";
  const couponCode = searchParams.get("coupon")?.toUpperCase();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Validate plan type
  useEffect(() => {
    if (!validPlanTypes.includes(planType)) {
      toast({
        title: "Plano inválido",
        description: "No momento, apenas o plano trimestral está disponível.",
        variant: "destructive",
      });
      navigate(`/checkout?plan=quarterly${couponCode ? `&coupon=${couponCode}` : ""}`, { replace: true });
    }
  }, [planType, couponCode, navigate]);

  // Memoize plan and coupon details
  const { plan, coupon, isCouponValid, discount, finalPrice } = useMemo(() => {
    const activeCoupon = couponCode ? couponsConfig[couponCode as keyof typeof couponsConfig] : null;
    const isValid = Boolean(activeCoupon && activeCoupon.active && new Date(activeCoupon.validUntil) >= new Date());
    
    const selectedPlan = plansConfig[planType as keyof typeof plansConfig] || plansConfig.quarterly;

    let discountValue = 0;
    if (isValid && activeCoupon) {
        if (activeCoupon.discountType === "percentage") {
            discountValue = (selectedPlan.price * activeCoupon.discountValue) / 100;
        } else {
            discountValue = activeCoupon.discountValue;
        }
    }
    
    return {
        plan: selectedPlan,
        coupon: activeCoupon,
        isCouponValid: isValid,
        discount: discountValue,
        finalPrice: Math.max(0, selectedPlan.price - discountValue)
    };
  }, [planType, couponCode]);

  // Auth check
  useEffect(() => {
    if (!user) {
      navigate(`/auth?signup=true&checkout=true&plan=${planType}`);
      return;
    }
  }, [user, planType, navigate]);

  const handlePaymentSubmit = useCallback(async (paymentData: any) => {
    console.log("[CHECKOUT] Payment data received:", {
      paymentType: paymentData.paymentType,
      hasFormData: !!paymentData.formData,
    });

    try {
      // If payment method is PIX, redirect to PIX payment page
      if (paymentData.paymentType === "bank_transfer") {
        navigate(`/pix-payment?plan=${planType}&coupon=${couponCode || ""}`);
        return;
      }

      setLoading(true);

      // Server calculates the price - don't send amount from client
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          paymentData: paymentData,
          planType: planType,
          couponCode: couponCode || null,
          paymentMethod: paymentData.paymentType,
        },
      });

      // Handle network/server errors
      if (error) {
        console.error("[CHECKOUT] Error invoking payment function:", {
          error,
          message: error?.message,
          name: error?.name,
        });
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
          variant: "destructive",
          duration: 6000,
        });
        setLoading(false);
        return;
      }

      // Handle successful payment
      if (data?.success) {
        toast({
          title: "Pagamento aprovado!",
          description: "Sua assinatura foi ativada com sucesso.",
        });
        navigate("/payment-success");
        return;
      }

      // Handle payment rejection with specific error message
      const errorMessage = data?.error || "O pagamento não foi aprovado. Tente novamente.";

      console.error("[CHECKOUT] Payment rejected:", {
        error: errorMessage,
        details: data?.details,
        status: data?.details?.status,
        statusDetail: data?.details?.status_detail,
      });

      toast({
        title: "Pagamento não aprovado",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });

      setLoading(false);
    } catch (error) {
      console.error("[CHECKOUT] Exception in handlePaymentSubmit:", {
        error,
        message: error instanceof Error ? error.message : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [planType, couponCode, navigate]);

  const handleBack = useCallback(() => {
    if (hasInteracted) {
      setPendingNavigation("/");
      setShowExitDialog(true);
    } else {
      navigate("/");
    }
  }, [hasInteracted, navigate]);

  const handleBreadcrumbClick = useCallback((e: React.MouseEvent, path: string) => {
    if (hasInteracted) {
      e.preventDefault();
      setPendingNavigation(path);
      setShowExitDialog(true);
    }
  }, [hasInteracted]);

  const confirmExit = useCallback(() => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowExitDialog(false);
    setPendingNavigation(null);
  }, [pendingNavigation, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Breadcrumb className="mt-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" onClick={(e) => handleBreadcrumbClick(e, "/")}>
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/meu-corre" onClick={(e) => handleBreadcrumbClick(e, "/meu-corre")}>
                    Meu Corre
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
              Finalize sua <span className="text-primary whitespace-nowrap">Assinatura</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              Você está contratando o <span className="font-semibold text-foreground">{plan.name}</span>
            </p>
          </div>

          {/* Plan Summary */}
          <div className="bg-gradient-to-br from-card via-card to-card/50 rounded-2xl p-6 sm:p-8 border border-border/50 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valor</p>
                <p
                  className={`text-3xl font-bold ${discount > 0 ? "line-through text-muted-foreground" : "text-primary"}`}
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
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <h2 className="text-2xl font-bold">Pagamento</h2>
            </div>

            {/* Payment Brick - Replaced by Transparent Checkout */}
            <div id="payment-brick-container" className="space-y-4 animate-fade-in">
                <TransparentCheckoutForm
                    amount={finalPrice}
                    onPaymentSubmit={handlePaymentSubmit}
                    loading={loading}
                />
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">Pagamento processado com segurança pelo Mercado Pago 🔒</p>
          </div>
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do checkout?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem um pagamento em andamento. Tem certeza que deseja sair? Seus dados não serão salvos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar pagando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default Checkout;
