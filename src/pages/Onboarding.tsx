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
import { SERVICE_TYPES } from '@/lib/service-type-utils';
import { isValidCPF, formatCPF } from '@/lib/cpf-utils';


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

    // CPF será criptografado de forma segura no servidor via edge function
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
        description: error.message || "Não foi possível salvar seus dados"
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
                  onChange={e => setCpf(formatCPF(e.target.value))}
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
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
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
