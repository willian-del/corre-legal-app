import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Shield, CheckCircle, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { updateProfile, isProfileComplete } from "@/lib/profile-utils";
import { SERVICE_TYPES } from "@/lib/service-type-utils";
import { isValidCPF, formatCPF } from "@/lib/cpf-utils";

const loginSchema = z.object({
  email: z.string().email({
    message: "Email inválido",
  }),
  password: z.string().min(6, {
    message: "Senha deve ter no mínimo 6 caracteres",
  }),
});

const signUpSchema = z
  .object({
    email: z.string().email({ message: "Email inválido" }),
    password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
    passwordConfirm: z.string(),
    fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
    cpf: z
      .string()
      .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, { message: "CPF inválido (formato: 000.000.000-00)" })
      .refine((val) => isValidCPF(val), {
        message: "CPF inválido - verifique os dígitos verificadores",
      }),
    phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, { message: "Telefone inválido (formato: (00) 00000-0000)" }),
    serviceType: z.string().min(1, { message: "Selecione o tipo de serviço" }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "As senhas não conferem",
    path: ["passwordConfirm"],
  });

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading, profileComplete, checkProfile } = useAuth();

  // Mode toggle
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  // Detect signup parameter in URL
  useEffect(() => {
    const signupParam = searchParams.get("signup");
    if (signupParam === "true") {
      setIsSignUpMode(true);
    }
  }, [searchParams]);

  // Detect password reset mode
  useEffect(() => {
    const resetParam = searchParams.get("reset");
    if (resetParam === "true") {
      setIsResetMode(true);
    }
  }, [searchParams]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sign up form
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [signUpErrors, setSignUpErrors] = useState<any>({});

  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Password reset mode (after clicking email link)
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [resetPasswordErrors, setResetPasswordErrors] = useState<any>({});

  // Sign-up flow state
  const [completingSignUp, setCompletingSignUp] = useState(false);

  useEffect(() => {
    // Don't redirect if in password reset mode
    if (isResetMode) return;

    // Only redirect if not completing sign-up
    if (!loading && user && profileComplete !== null && !completingSignUp) {
      // Prioridade 1: Se veio do checkout, voltar para página inicial com flag
      const checkoutParam = searchParams.get("checkout");
      const planParam = searchParams.get("plan");

      if (checkoutParam === "true" && planParam) {
        navigate(`/?checkout=true&plan=${planParam}`);
        return;
      }

      // Prioridade 2: Redirect explícito
      const redirectParam = searchParams.get("redirect");
      if (redirectParam) {
        navigate(redirectParam);
        return;
      }

      // Prioridade 3: Redirecionamento baseado em perfil
      if (!profileComplete) {
        navigate("/onboarding");
      } else {
        navigate("/meu-corre");
      }
    }
  }, [user, loading, profileComplete, navigate, searchParams, completingSignUp, isResetMode]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setLoginErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      setIsSubmitting(false);
      return;
    }

    // Iniciar animação de fade-out
    setIsTransitioning(true);

    // Aguardar animação completar
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verificar se o perfil está completo e redirecionar
    await checkProfile();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser) {
      const complete = await isProfileComplete(currentUser.id);

      // Prioridade 1: Checkout flow
      const checkoutParam = searchParams.get("checkout");
      const planParam = searchParams.get("plan");

      if (checkoutParam === "true" && planParam) {
        navigate(`/?checkout=true&plan=${planParam}`);
        return;
      }

      // Prioridade 2: Redirect explícito
      const redirectParam = searchParams.get("redirect");

      if (redirectParam) {
        navigate(redirectParam);
      } else if (!complete) {
        navigate("/onboarding");
      } else {
        // Verificar se já viu a tela de boas-vindas
        const { hasSeenWelcome } = await import("@/lib/profile-utils");
        const seen = await hasSeenWelcome(currentUser.id);
        
        if (!seen) {
          navigate("/welcome");
        } else {
          navigate("/meu-corre");
        }
      }
    }

    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});

    const result = signUpSchema.safeParse({
      email: signUpEmail,
      password: signUpPassword,
      passwordConfirm: signUpPasswordConfirm,
      fullName,
      cpf,
      phone,
      serviceType,
    });

    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        errors[err.path[0]] = err.message;
      });
      setSignUpErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setCompletingSignUp(true);

    try {
      const { error } = await signUp(signUpEmail, signUpPassword, fullName, cpf, phone, serviceType);

      if (error) {
        setIsSubmitting(false);
        setCompletingSignUp(false);
        return;
      }

      // Após cadastro, fazer login automático
      const { error: signInError } = await signIn(signUpEmail, signUpPassword);

      if (signInError) {
        toast.error("Cadastro realizado! Faça login para continuar.");
        setIsSignUpMode(false);
        setIsSubmitting(false);
        setCompletingSignUp(false);
        return;
      }

      // Aguardar sessão estar pronta e salvar o CPF
      await new Promise((resolve) => setTimeout(resolve, 500));

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        // Verificar se o perfil foi criado pela trigger
        const { data: profileData, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", currentUser.id)
          .single();

        // Se não existir perfil, criar manualmente (fallback caso trigger falhe)
        if (profileCheckError || !profileData) {
          if (import.meta.env.DEV) {
            console.log("Trigger não criou perfil, criando manualmente");
          }

          await supabase.from("profiles").insert({
            id: currentUser.id,
            full_name: fullName,
            phone: phone,
            service_type: serviceType,
          });
        }

        // Atualizar perfil com CPF
        await updateProfile(currentUser.id, {
          cpf: cpf,
          phone: phone,
          service_type: serviceType,
        });

        // Aguardar confirmação de que o perfil foi salvo completamente
        let retries = 0;
        const maxRetries = 10;
        let profileIsComplete = false;

        while (retries < maxRetries && !profileIsComplete) {
          profileIsComplete = await isProfileComplete(currentUser.id);
          if (!profileIsComplete) {
            await new Promise(resolve => setTimeout(resolve, 300));
            retries++;
          }
        }

        if (!profileIsComplete) {
          if (import.meta.env.DEV) {
            console.error('Perfil não foi completado após tentativas de verificação');
          }
          toast.error("Houve um problema ao salvar seus dados. Por favor, complete seu cadastro.");
          setIsSubmitting(false);
          setCompletingSignUp(false);
          navigate("/onboarding");
          return;
        }

        await checkProfile();

        toast.success("Cadastro completo! Bem-vindo ao Corre Legal.");

        // Check if came from checkout flow
        const checkoutParam = searchParams.get("checkout");
        const planParam = searchParams.get("plan");

        // Navegar SOMENTE após confirmar que o perfil está completo
        // Novos usuários vão para a tela de boas-vindas
        if (checkoutParam === "true" && planParam) {
          navigate(`/?checkout=true&plan=${planParam}`);
        } else {
          navigate("/welcome");
        }
      }
    } catch (profileError) {
      if (import.meta.env.DEV) {
        console.error("Erro ao completar perfil:", profileError);
      }
      toast.error("Erro ao completar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
      setCompletingSignUp(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error("Por favor, digite seu email");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setIsSubmitting(false);

    if (!error) {
      setResetEmailSent(true);
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } else {
      toast.error("Erro ao enviar email de recuperação. Verifique se o email está correto.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordErrors({});

    // Validação
    if (newPassword.length < 6) {
      setResetPasswordErrors({ newPassword: "Senha deve ter no mínimo 6 caracteres" });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setResetPasswordErrors({ newPasswordConfirm: "As senhas não conferem" });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    console.log(error);

    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao atualizar senha. Tente novamente.");
      return;
    }

    toast.success("Senha atualizada com sucesso!");
    setIsResetMode(false);

    // Redirecionar para área logada
    await checkProfile();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser) {
      const complete = await isProfileComplete(currentUser.id);
      navigate(complete ? "/meu-corre" : "/onboarding");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />
        <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative px-4 py-12 transition-opacity duration-300 ${isTransitioning ? "animate-fade-out" : ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8 animate-in fade-in duration-500">
          <Logo size={80} />
        </div>

        <div className="text-center mb-8 space-y-2 animate-in fade-in duration-500 delay-100">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Bem-vindo ao Corre Legal</h1>
          <p className="text-muted-foreground">Seu parceiro legal para o corre de todo dia</p>
        </div>

        <Card className="bg-card border border-border rounded-2xl shadow-elevated animate-in fade-in duration-700 delay-300">
          <CardHeader className="p-6 md:p-8 pb-4">
            {!showPasswordReset && (
              <div className="flex justify-center gap-2 mb-4">
                <Button
                  type="button"
                  variant={!isSignUpMode ? "default" : "outline"}
                  onClick={() => setIsSignUpMode(false)}
                  className="flex-1"
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={isSignUpMode ? "default" : "outline"}
                  onClick={() => setIsSignUpMode(true)}
                  className="flex-1"
                >
                  Cadastre-se
                </Button>
              </div>
            )}
            <CardTitle className="text-2xl">
              {isResetMode
                ? "Criar Nova Senha"
                : showPasswordReset
                  ? "Recuperar Senha"
                  : isSignUpMode
                    ? "Cadastre-se"
                    : "Fazer Login"}
            </CardTitle>
            <CardDescription className="text-base">
              {isResetMode
                ? "Digite sua nova senha abaixo"
                : showPasswordReset
                  ? "Digite seu email para receber instruções de recuperação"
                  : isSignUpMode
                    ? "Crie sua conta gratuitamente para contratar um plano Corre Legal"
                    : "Entre com suas credenciais"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            {isResetMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-foreground">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Crie uma nova senha segura para sua conta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {resetPasswordErrors.newPassword && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {resetPasswordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password-confirm">Confirmar Nova Senha</Label>
                  <Input
                    id="new-password-confirm"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {resetPasswordErrors.newPasswordConfirm && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {resetPasswordErrors.newPasswordConfirm}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    "Atualizar Senha"
                  )}
                </Button>
              </form>
            ) : showPasswordReset ? (
              <>
                {resetEmailSent ? (
                  <div className="space-y-6">
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 text-center space-y-3 animate-in fade-in">
                      <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                      <div>
                        <p className="font-semibold text-foreground mb-1">Email enviado com sucesso!</p>
                        <p className="text-sm text-muted-foreground">
                          Verifique sua caixa de entrada e siga as instruções.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full transition-all duration-300 hover:-translate-y-0.5"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setResetEmailSent(false);
                        setResetEmail("");
                      }}
                    >
                      Voltar para o Login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Enviando..." : "Enviar Email de Recuperação"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full transition-all duration-300"
                      onClick={() => setShowPasswordReset(false)}
                    >
                      Voltar para o Login
                    </Button>
                  </form>
                )}
              </>
            ) : isSignUpMode ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.fullName && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.email && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-cpf">CPF</Label>
                  <Input
                    id="signup-cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.cpf && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.cpf}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input
                    id="signup-phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.phone && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-service">Tipo de Serviço</Label>
                  <Select value={serviceType} onValueChange={setServiceType} required>
                    <SelectTrigger className="focus:border-primary transition-colors">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {signUpErrors.serviceType && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.serviceType}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.password && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">Confirmar Senha</Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={signUpPasswordConfirm}
                    onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {signUpErrors.passwordConfirm && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {signUpErrors.passwordConfirm}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="button-loading-pulse">Criando conta...</span>
                    </>
                  ) : (
                    "Criar Conta Grátis"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Já fez o seu cadastro?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUpMode(false)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Faça seu login
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {loginErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="login-password">Senha</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs h-auto p-0 text-primary hover:text-primary-glow"
                      onClick={() => setShowPasswordReset(true)}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {loginErrors.password}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="button-loading-pulse">Entrando...</span>
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Novo usuário?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUpMode(true)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Cadastre-se agora
                    </button>
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center animate-in fade-in duration-700 delay-500">
          <Button
            variant="ghost"
            onClick={() => {
              navigate("/");
              window.scrollTo(0, 0);
            }}
            className="text-muted-foreground hover:text-primary transition-all duration-300 hover:-translate-y-0.5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
