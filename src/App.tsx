import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Lazy load de todas as páginas para code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const MeuCorre = lazy(() => import("./pages/MeuCorre"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PixPayment = lazy(() => import("./pages/PixPayment"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

// Componente de loading
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/pix-payment" element={<PixPayment />} />
              
              {/* Welcome - tela de boas-vindas após primeiro login */}
              <Route
                path="/welcome"
                element={
                  <ProtectedRoute requireCompleteProfile={false} requireSubscription={false}>
                    <Welcome />
                  </ProtectedRoute>
                }
              />
              
              {/* Onboarding - apenas requer autenticação */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireCompleteProfile={false} requireSubscription={false}>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              
              {/* Meu Corre - requer perfil completo (assinatura opcional) */}
              <Route
                path="/meu-corre"
                element={
                  <ProtectedRoute requireCompleteProfile={true} requireSubscription={false}>
                    <MeuCorre />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin - requer autenticação + role admin */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
