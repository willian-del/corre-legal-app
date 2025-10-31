import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { z } from 'zod';
const loginSchema = z.object({
  email: z.string().email({
    message: "Email inválido"
  }),
  password: z.string().min(6, {
    message: "Senha deve ter no mínimo 6 caracteres"
  })
});
const signupSchema = loginSchema.extend({
  fullName: z.string().min(3, {
    message: "Nome deve ter no mínimo 3 caracteres"
  }).max(100),
  cpf: z.string()
    .min(11, { message: "CPF deve ter 11 dígitos" })
    .max(14, { message: "CPF inválido" })
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      return numbers.length === 11;
    }, { message: "CPF deve ter 11 dígitos" }),
  phone: z.string()
    .min(10, { message: "Telefone deve ter no mínimo 10 dígitos" })
    .max(15, { message: "Telefone inválido" })
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      return numbers.length >= 10 && numbers.length <= 11;
    }, { message: "Telefone inválido" }),
  serviceType: z.string().min(1, {
    message: "Selecione o tipo de serviço"
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"]
});
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    signIn,
    signUp,
    loading
  } = useAuth();
  const [activeTab, setActiveTab] = useState('login');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<any>({});

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [signupErrors, setSignupErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const {
      error
    } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (!error) {
      const redirectTo = searchParams.get('redirect') || '/';
      navigate(redirectTo);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    const result = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      confirmPassword,
      fullName,
      cpf,
      phone,
      serviceType
    });
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach(err => {
        errors[err.path[0]] = err.message;
      });
      setSignupErrors(errors);
      return;
    }
    setIsSubmitting(true);
    
    // Remove formatting before sending
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    
    const {
      error
    } = await signUp(signupEmail, signupPassword, fullName, cleanCpf, cleanPhone, serviceType);
    setIsSubmitting(false);
    if (!error) {
      setActiveTab('login');
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');
      setFullName('');
      setCpf('');
      setPhone('');
      setServiceType('');
    }
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={72} />
        </div>

        <div className="text-center mb-6 animate-in fade-in duration-500">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Bem-vindo ao seu parceiro de corre!</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Cadastro</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo de volta</CardTitle>
                <CardDescription>Entre com suas credenciais para acessar sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    {loginErrors.email && <p className="text-sm text-destructive">{loginErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" placeholder="••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    {loginErrors.password && <p className="text-sm text-destructive">{loginErrors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Criar conta</CardTitle>
                <CardDescription>Preencha os dados para criar sua conta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input id="signup-name" type="text" placeholder="Seu nome" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    {signupErrors.fullName && <p className="text-sm text-destructive">{signupErrors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-cpf">CPF</Label>
                    <Input 
                      id="signup-cpf" 
                      type="text" 
                      placeholder="000.000.000-00" 
                      value={cpf} 
                      onChange={e => setCpf(formatCpf(e.target.value))} 
                      required 
                    />
                    {signupErrors.cpf && <p className="text-sm text-destructive">{signupErrors.cpf}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    {signupErrors.email && <p className="text-sm text-destructive">{signupErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Telefone</Label>
                    <Input 
                      id="signup-phone" 
                      type="text" 
                      placeholder="(00) 00000-0000" 
                      value={phone} 
                      onChange={e => setPhone(formatPhone(e.target.value))} 
                      required 
                    />
                    {signupErrors.phone && <p className="text-sm text-destructive">{signupErrors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-service">Qual o seu corre?</Label>
                    <Select value={serviceType} onValueChange={setServiceType}>
                      <SelectTrigger id="signup-service" className="bg-background">
                        <SelectValue placeholder="Selecione seu serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="uber">Uber</SelectItem>
                        <SelectItem value="99">99</SelectItem>
                        <SelectItem value="indrive">inDrive</SelectItem>
                        <SelectItem value="ifood">iFood</SelectItem>
                        <SelectItem value="rappi">Rappi</SelectItem>
                        <SelectItem value="loggi">Loggi</SelectItem>
                        <SelectItem value="lalamove">Lalamove</SelectItem>
                        <SelectItem value="delivery-much">Delivery Much</SelectItem>
                        <SelectItem value="aiqfome">Aiqfome</SelectItem>
                        <SelectItem value="borzo">Borzo</SelectItem>
                        <SelectItem value="total-express">Total Express</SelectItem>
                        <SelectItem value="mercado-livre">Mercado Livre / Mercado Envios</SelectItem>
                        <SelectItem value="uello">Uello</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    {signupErrors.serviceType && <p className="text-sm text-destructive">{signupErrors.serviceType}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                    {signupErrors.password && <p className="text-sm text-destructive">{signupErrors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input id="confirm-password" type="password" placeholder="••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    {signupErrors.confirmPassword && <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
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
    </div>;
};
export default Auth;