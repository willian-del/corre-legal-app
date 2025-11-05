import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email({
    message: "Email inválido"
  }),
  password: z.string().min(6, {
    message: "Senha deve ter no mínimo 6 caracteres"
  })
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, loading, profileComplete } = useAuth();

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (!loading && user && profileComplete !== null) {
      const redirectParam = searchParams.get('redirect');
      
      // Se há um redirect explícito na URL, usar ele
      if (redirectParam) {
        navigate(redirectParam);
        return;
      }
      
      // Redirecionamento inteligente baseado no perfil
      if (!profileComplete) {
        navigate('/onboarding');
      } else {
        navigate('/meu-corre');
      }
    }
  }, [user, loading, profileComplete, navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    const result = loginSchema.safeParse({
      email: loginEmail,
      password: loginPassword
    });

    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach(err => {
        errors[err.path[0]] = err.message;
      });
      setLoginErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      return;
    }

    // O redirecionamento será feito pelo useEffect acima
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Por favor, digite seu email');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`
    });
    setIsSubmitting(false);

    if (!error) {
      setResetEmailSent(true);
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } else {
      toast.error('Erro ao enviar email de recuperação. Verifique se o email está correto.');
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
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8 animate-in fade-in duration-500">
          <Logo size={80} />
        </div>

        <div className="text-center mb-8 space-y-2 animate-in fade-in duration-500 delay-100">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">
            Bem-vindo ao Corre Legal
          </h1>
          <p className="text-muted-foreground">
            Seu parceiro legal para o corre de todo dia
          </p>
        </div>

        <Card className="bg-card border-primary/30 rounded-2xl shadow-elevated mb-6 animate-in fade-in duration-700 delay-200">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Ainda não contratou um plano?
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para acessar a área de cliente, você precisa primeiro contratar um dos nossos planos.
                  Após o pagamento, você receberá suas credenciais de acesso por email.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/#pricing')}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-300 hover:-translate-y-0.5"
            >
              Ver Planos e Contratar
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border rounded-2xl shadow-elevated animate-in fade-in duration-700 delay-300">
          <CardHeader className="p-6 md:p-8 pb-4">
            <CardTitle className="text-2xl">{showPasswordReset ? 'Recuperar Senha' : 'Fazer Login'}</CardTitle>
            <CardDescription className="text-base">
              {showPasswordReset 
                ? 'Digite seu email para receber instruções de recuperação' 
                : 'Entre com suas credenciais recebidas por email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            {showPasswordReset ? (
              <>
                {resetEmailSent ? (
                  <div className="space-y-6">
                    <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 text-center space-y-3 animate-in fade-in">
                      <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                      <div>
                        <p className="font-semibold text-foreground mb-1">
                          Email enviado com sucesso!
                        </p>
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
                        setResetEmail('');
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
                        onChange={e => setResetEmail(e.target.value)}
                        className="focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar Email de Recuperação'}
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
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{loginErrors.email}</p>
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
                    onChange={e => setLoginPassword(e.target.value)}
                    className="focus:border-primary transition-colors"
                    required
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{loginErrors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary-glow text-primary-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center animate-in fade-in duration-700 delay-500">
          <Button
            variant="ghost"
            onClick={() => {
              navigate('/');
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
