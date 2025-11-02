import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profile-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import Logo from '@/components/Logo';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

// Função para validar CPF
const isValidCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  if (digit1 !== parseInt(numbers.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  return digit2 === parseInt(numbers.charAt(10));
};

const onboardingSchema = z.object({
  cpf: z.string()
    .min(11, { message: "CPF deve ter 11 dígitos" })
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      return numbers.length === 11;
    }, { message: "CPF deve ter 11 dígitos" })
    .refine((val) => isValidCPF(val), { 
      message: "CPF inválido - verifique os dígitos" 
    }),
  phone: z.string()
    .min(10, { message: "Telefone deve ter no mínimo 10 dígitos" })
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      return numbers.length >= 10 && numbers.length <= 11;
    }, { message: "Telefone inválido" }),
  serviceType: z.string().min(1, {
    message: "Selecione o tipo de serviço"
  }),
});

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = onboardingSchema.safeParse({
      cpf,
      phone,
      serviceType
    });

    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach(err => {
        errors[err.path[0]] = err.message;
      });
      setErrors(errors);
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não encontrado"
      });
      return;
    }

    setIsSubmitting(true);

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    const { error } = await updateProfile(user.id, {
      cpf: cleanCpf,
      phone: cleanPhone,
      service_type: serviceType
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar dados",
        description: error.message
      });
      return;
    }

    toast({
      title: "Cadastro completo!",
      description: "Seus dados foram salvos com sucesso."
    });

    navigate('/meu-corre');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={72} />
        </div>

        <div className="text-center mb-6 animate-in fade-in duration-500">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            Complete seu Cadastro
          </h1>
          <p className="text-muted-foreground">
            Precisamos de alguns dados adicionais para ativar sua conta
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Estes dados são necessários para sua proteção jurídica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  type="text" 
                  placeholder="000.000.000-00" 
                  value={cpf} 
                  onChange={e => setCpf(formatCpf(e.target.value))} 
                  required 
                />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
                <p className="text-xs text-muted-foreground">
                  ⚠️ Seu CPF não poderá ser alterado após o cadastro
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  type="text" 
                  placeholder="(00) 00000-0000" 
                  value={phone} 
                  onChange={e => setPhone(formatPhone(e.target.value))} 
                  required 
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-type">Qual o seu corre?</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger id="service-type">
                    <SelectValue placeholder="Selecione seu serviço" />
                  </SelectTrigger>
                  <SelectContent>
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
                {errors.serviceType && <p className="text-sm text-destructive">{errors.serviceType}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Completar Cadastro'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
