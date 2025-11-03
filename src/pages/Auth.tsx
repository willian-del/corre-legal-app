import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
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
  const { user, signIn, loading } = useAuth();

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
    if (!loading && user) {
      const redirectTo = searchParams.get('redirect') || '/';
      navigate(redirectTo);
    }
  }, [user, loading, navigate, searchParams]);

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

    if (!error) {
      const redirectTo = searchParams.get('redirect') || '/';
      navigate(redirectTo);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={72} />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Bem-vindo ao Corre Legal
          </h1>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            <strong>Ainda não contratou um plano?</strong><br />
            Para acessar a área de cliente, você precisa primeiro contratar um dos nossos planos.
            Após o pagamento, você receberá suas credenciais de acesso por email.
          </p>
          <Button
            onClick={() => navigate('/#pricing')}
            variant="outline"
            className="w-full border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            Ver Planos e Contratar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{showPasswordReset ? 'Recuperar Senha' : 'Fazer Login'}</CardTitle>
            <CardDescription>
              {showPasswordReset 
                ? 'Digite seu email para receber instruções de recuperação' 
                : 'Entre com suas credenciais recebidas por email'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showPasswordReset ? (
              <>
                {resetEmailSent ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        ✅ Email enviado com sucesso!<br />
                        Verifique sua caixa de entrada e siga as instruções.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full" 
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
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Enviando...' : 'Enviar Email de Recuperação'}
                    </Button>

                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowPasswordReset(false)}
                    >
                      Voltar para o Login
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                  {loginErrors.email && (
                    <p className="text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="login-password">Senha</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs h-auto p-0"
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
                    required
                  />
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-primary"
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
