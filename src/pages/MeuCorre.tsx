import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Clock, CreditCard, Calendar, Shield, RefreshCw, User } from 'lucide-react';
import Logo from '@/components/Logo';
import { PLAN_DETAILS } from '@/lib/stripe-config';
import { getProfile, updateProfile, getMaskedCPF } from '@/lib/profile-utils';
import { useToast } from '@/hooks/use-toast';

interface UserSubscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string;
  days_remaining: number;
  payment_method: string;
  amount_paid: number;
}

const MeuCorre = () => {
  const { user, signOut, checkProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile editing
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [maskedCpf, setMaskedCpf] = useState('***.***.***-**');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setPhone(profile.phone || '');
        setServiceType(profile.service_type || '');
        
        // Get masked CPF from secure edge function (only if session is valid)
        const maskedCpf = await getMaskedCPF(user.id);
        setMaskedCpf(maskedCpf || 'Não informado');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Don't show error toast - CPF might just not be set yet
    }
  };

  const fetchSubscription = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc('get_active_subscription', {
      _user_id: user.id
    });

    if (error) {
      // Não logar detalhes do erro de banco no console
      // Em produção, isso seria enviado para um serviço de error tracking
      if (import.meta.env.DEV) {
        console.error('Erro ao buscar assinatura:', error);
      }
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setSubscription(data[0]);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSubscribe = () => {
    navigate('/#pricing');
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchSubscription();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsEditingProfile(true);

    const { error } = await updateProfile(user.id, {
      phone: phone.replace(/\D/g, ''),
      service_type: serviceType
    });

    setIsEditingProfile(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message
      });
      return;
    }

    toast({
      title: "Dados atualizados!",
      description: "Suas informações foram salvas com sucesso."
    });

    await checkProfile();
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size={48} />
              <span className="text-xl font-bold text-foreground">Corre Legal</span>
            </div>
            <Button variant="ghost" onClick={handleSignOut} className="gap-2">
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              Meu <span className="text-primary">Corre</span>
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>

          {subscription ? (
            <>
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border-2 border-primary/20">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-primary" />
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Plano Ativo</h2>
                      <p className="text-muted-foreground">Você está protegido!</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Plano</span>
                    </div>
                    <p className="text-xl font-bold text-foreground capitalize">
                      {PLAN_DETAILS[subscription.plan_type as keyof typeof PLAN_DETAILS]?.name || subscription.plan_type}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      R$ {subscription.amount_paid.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Validade</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {new Date(subscription.expires_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription.days_remaining} dias restantes
                    </p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Pagamento</span>
                    </div>
                    <p className="text-lg font-bold text-foreground capitalize">
                      {subscription.payment_method === 'credit_card' ? 'Cartão' : subscription.payment_method}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Status: Ativo
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  variant="outline"
                  className="w-full"
                >
                  Renovar Plano
                </Button>
              </div>

              <div className="bg-card rounded-2xl p-8 border border-border">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Recursos em Desenvolvimento
                </h3>
                <div className="space-y-3">
                  {[
                    "Central de Atendimento Jurídico",
                    "Histórico de Solicitações",
                    "Documentos e Contratos",
                    "Chat com Suporte",
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                    >
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meus Dados */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <CardTitle>Meus Dados</CardTitle>
                  </div>
                  <CardDescription>
                    Edite suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        O email não pode ser alterado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input 
                        id="cpf" 
                        type="text" 
                        value={maskedCpf} 
                        disabled 
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        ⚠️ O CPF não pode ser alterado por segurança
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service-type">Tipo de Serviço</Label>
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
                    </div>

                    <Button type="submit" className="w-full" disabled={isEditingProfile}>
                      {isEditingProfile ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="bg-card rounded-2xl p-8 border-2 border-primary/20 text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Você ainda não possui um plano ativo
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Para ter acesso completo à área do cliente e todos os benefícios do Corre Legal,
                você precisa contratar um de nossos planos.
              </p>
              <Button onClick={handleSubscribe} size="lg">
                Ver Planos Disponíveis
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MeuCorre;
