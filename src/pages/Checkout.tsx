import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowLeft, Tag, RefreshCw, QrCode } from "lucide-react";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

// SDK initialization state
let mpInitialized = false;
const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const planType = searchParams.get("plan") || "quarterly";
  const couponCode = searchParams.get("coupon")?.toUpperCase();
  const [initialization, setInitialization] = useState<any>(null);
  const hasCreatedPreference = useRef(false);
  const brickMounted = useRef(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // SDK loading states
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const sdkInitAttempted = useRef(false);

  // Helper function to add timeout to a promise
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    return Promise.race([promise, timeout]);
  };

  // Initialize SDK using loadMercadoPago to explicitly load the external script
  useEffect(() => {
    if (sdkInitAttempted.current) return;
    sdkInitAttempted.current = true;

    const initSdk = async () => {
      console.log("[CHECKOUT] Starting SDK initialization with loadMercadoPago...", {
        publicKey: !!publicKey,
        mpInitialized,
        windowMercadoPago: !!(window as any).MercadoPago,
      });

      if (!publicKey) {
        console.error("[CHECKOUT] No public key available");
        setSdkError(true);
        return;
      }

      try {
        // Step 1: Explicitly load the external Mercado Pago script with 10s timeout
        console.log("[CHECKOUT] Loading external Mercado Pago script (timeout: 10s)...");
        await withTimeout(
          loadMercadoPago(),
          10000,
          "Timeout: O sistema de pagamento demorou muito para carregar"
        );
        console.log("[CHECKOUT] External script loaded, window.MercadoPago:", !!(window as any).MercadoPago);

        // Step 2: Initialize the React SDK with public key
        if (!mpInitialized) {
          console.log("[CHECKOUT] Calling initMercadoPago...");
          initMercadoPago(publicKey, { locale: "pt-BR" });
          mpInitialized = true;
          console.log("[CHECKOUT] initMercadoPago called successfully");
        }

        // SDK is now ready
        console.log("[CHECKOUT] SDK fully loaded and ready!");
        setSdkReady(true);
      } catch (e) {
        console.error("[CHECKOUT] Error loading Mercado Pago SDK:", e);
        setSdkError(true);
        
        const isTimeout = e instanceof Error && e.message.includes("Timeout");
        toast({
          title: "Erro ao carregar pagamento",
          description: isTimeout 
            ? "O carregamento está demorando. Verifique sua conexão e tente novamente."
            : "Não foi possível carregar o sistema de pagamento. Tente recarregar a página.",
          variant: "destructive",
        });
      }
    };

    initSdk();
  }, [toast]);

  // Retry SDK load
  const handleRetryLoad = useCallback(() => {
    console.log("[CHECKOUT] Retrying SDK load...");
    setSdkError(false);
    sdkInitAttempted.current = false;
    mpInitialized = false;
    window.location.reload();
  }, []);

  // Validate plan type - only quarterly is valid
  const validPlanTypes = Object.keys(PLAN_DETAILS);
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

  // Get coupon details
  const coupon = couponCode ? couponsConfig[couponCode as keyof typeof couponsConfig] : null;
  const isCouponValid = coupon && coupon.active && new Date(coupon.validUntil) >= new Date();

  const plan = plansConfig[planType as keyof typeof plansConfig] || plansConfig.quarterly;

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

  // Cleanup Payment Brick on unmount using Mercado Pago's unmount method
  useEffect(() => {
    return () => {
      console.log("[CHECKOUT] Component unmounting, cleaning up brick");
      // Try to unmount the brick controller if it exists
      const brickController = (window as any).paymentBrickController;
      if (brickController?.unmount) {
        try {
          brickController.unmount();
          console.log("[CHECKOUT] Brick unmounted successfully");
        } catch (e) {
          console.log("[CHECKOUT] Brick unmount error:", e);
        }
      }
      brickMounted.current = false;
    };
  }, []);

  // Clear container when preferenceId changes to prevent duplicates
  useEffect(() => {
    if (initialization?.preferenceId) {
      const container = document.getElementById("payment-brick-container");
      if (container && container.children.length > 0) {
        console.log("[CHECKOUT] Clearing container for new preference");
        container.innerHTML = "";
        brickMounted.current = false;
      }
    }
  }, [initialization?.preferenceId]);

  // Protect against browser navigation (close tab, refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasInteracted && !loading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasInteracted, loading]);

  // Create payment preference
  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      navigate(`/auth?signup=true&checkout=true&plan=${planType}`);
      return;
    }

    // Evitar múltiplas criações
    if (hasCreatedPreference.current) {
      return;
    }

    // Only proceed if plan type is valid (quarterly only)
    if (!validPlanTypes.includes(planType)) {
      return;
    }

    // Create payment preference and initialization
    const createPreference = async () => {
      try {
        setLoading(true);
        hasCreatedPreference.current = true;

        console.log("[CHECKOUT] Creating preference...", { planType, couponCode, userId: user?.id });

        const { data, error } = await supabase.functions.invoke("create-mercadopago-preference", {
          body: {
            plan_type: planType,
            coupon_code: couponCode || null,
          },
        });

        if (error) {
          console.error("[CHECKOUT] Error creating preference:", error);
          hasCreatedPreference.current = false;
          toast({
            title: "Erro ao preparar pagamento",
            description: "Não foi possível preparar o checkout. Tente novamente.",
            variant: "destructive",
          });
          return;
        }

        if (data?.preference_id) {
          console.log("[CHECKOUT] Preference created:", { preferenceId: data.preference_id });
          setInitialization({
            amount: finalPrice,
            preferenceId: data.preference_id,
          });
        }
      } catch (error) {
        console.error("[CHECKOUT] Error in createPreference:", error);
        hasCreatedPreference.current = false;
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
  }, [user, planType, finalPrice, couponCode, validPlanTypes]);

  // Debug log for render state
  useEffect(() => {
    console.log("[CHECKOUT] Render state:", {
      loading,
      mpInitialized,
      sdkReady,
      sdkError,
      windowMercadoPago: !!(window as any).MercadoPago,
      hasInitialization: !!initialization,
      preferenceId: initialization?.preferenceId,
      brickMounted: brickMounted.current,
      userId: user?.id,
    });
  }, [loading, initialization, user?.id, sdkReady, sdkError]);

  const handlePaymentSubmit = async (paymentData: any) => {
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
  };

  const handlePaymentError = (error: any) => {
    console.error("[CHECKOUT] Payment brick error:", {
      error,
      message: error?.message,
      cause: error?.cause,
      type: typeof error,
      stringified: JSON.stringify(error),
    });
    toast({
      title: "Erro no pagamento",
      description: error?.message || "Ocorreu um erro ao processar o pagamento. Tente novamente.",
      variant: "destructive",
    });
  };

  const handleBack = () => {
    if (hasInteracted) {
      setPendingNavigation("/");
      setShowExitDialog(true);
    } else {
      navigate("/");
    }
  };

  const handleBreadcrumbClick = (e: React.MouseEvent, path: string) => {
    if (hasInteracted) {
      e.preventDefault();
      setPendingNavigation(path);
      setShowExitDialog(true);
    }
  };

  const confirmExit = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowExitDialog(false);
    setPendingNavigation(null);
  };

  // Check if everything is ready to render the Payment brick
  const canRenderBrick = sdkReady && initialization && !loading && !sdkError;

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

            {/* SDK Error State - Show retry options */}
            {sdkError && (
              <div className="text-center py-8 space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Erro ao carregar pagamento</h3>
                  <p className="text-sm text-muted-foreground">
                    Não foi possível carregar o sistema de pagamento. Isso pode acontecer por instabilidade na conexão.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button onClick={handleRetryLoad} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/pix-payment?plan=${planType}&coupon=${couponCode || ""}`)}
                    className="gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    Pagar via PIX
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {!sdkError && (loading || !initialization || !sdkReady) && (
              <div className="space-y-6 animate-fade-in">
                {/* Payment Methods Skeleton */}
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </div>
                </div>

                {/* Card Form Skeleton */}
                <div className="space-y-4">
                  {/* Card Number */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>

                  {/* Card Holder Name */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-12 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-12 rounded-lg" />
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>

                  {/* Installments */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>
                </div>

                {/* Submit Button Skeleton */}
                <Skeleton className="h-12 w-full rounded-lg" />

                {/* Loading Text */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {!sdkReady ? "Carregando sistema de pagamento..." : "Preparando formulário de pagamento..."}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Brick */}
            {canRenderBrick && (
              <div id="payment-brick-container" className="space-y-4 animate-fade-in">
                <Payment
                  key={initialization?.preferenceId}
                  initialization={initialization}
                  onSubmit={handlePaymentSubmit}
                  onError={handlePaymentError}
                  onReady={() => {
                    console.log("[CHECKOUT] Payment Brick onReady fired!", {
                      preferenceId: initialization?.preferenceId,
                      windowMercadoPago: !!(window as any).MercadoPago,
                      timestamp: new Date().toISOString(),
                    });
                    brickMounted.current = true;
                    setHasInteracted(true);
                  }}
                  locale="pt-BR"
                  customization={{
                    paymentMethods: {
                      maxInstallments: 3,
                      bankTransfer: ["all"],
                      creditCard: ["all"],
                    },
                  }}
                />
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              Pagamento processado com segurança pelo Mercado Pago 🔒
            </p>
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
