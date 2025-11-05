import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { LogOut, Clock, CreditCard, Calendar, Shield, RefreshCw, User, MessageSquare, UserCircle, Trash2 } from 'lucide-react';
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

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // 1. Deletar dados do perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Deletar assinaturas do usuário
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (subscriptionError) throw subscriptionError;

      // 3. Deletar conta de autenticação (via edge function)
      const { error: authError } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (authError) throw authError;

      // 4. Fazer logout e redirecionar
      toast({
        title: "Conta deletada",
        description: "Sua conta e todos os dados foram removidos permanentemente.",
      });

      await signOut();
      navigate('/');

    } catch (error: any) {
      console.error('Erro ao deletar conta:', error);
      toast({
        variant: "destructive",
        title: "Erro ao deletar conta",
        description: error.message || "Não foi possível deletar sua conta. Tente novamente.",
      });
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
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              Meu <span className="text-primary">Corre</span>
            </h1>
            <p className="text-muted-foreground">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>

          {!subscription && (
            <div className="bg-card rounded-xl p-6 border-2 border-primary/20 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground mb-2">
                Você ainda não possui um plano ativo
              </h2>
              <p className="text-muted-foreground mb-4">
                Contrate um plano para ter acesso completo aos benefícios.
              </p>
              <Button onClick={handleSubscribe}>
                Contratar Plano
              </Button>
            </div>
          )}

          <Tabs defaultValue="chamados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chamados" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Chamados</span>
                <span className="sm:hidden">Chamados</span>
              </TabsTrigger>
              <TabsTrigger value="cadastro" className="gap-2">
                <UserCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Meu Cadastro</span>
                <span className="sm:hidden">Cadastro</span>
              </TabsTrigger>
              {subscription && (
                <TabsTrigger value="plano" className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Meu Plano</span>
                  <span className="sm:hidden">Plano</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Aba Meus Chamados */}
            <TabsContent value="chamados" className="mt-6">
              <div className="bg-card rounded-2xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <MessageSquare className="w-16 h-16 text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Precisa de Ajuda?</h3>
                    <p className="text-muted-foreground max-w-md">
                      Entre em contato com nossa equipe de atendimento jurídico através do WhatsApp
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => window.open('https://wa.me/551150395554', '_blank')}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Iniciar Atendimento
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Aba Meu Cadastro */}
            <TabsContent value="cadastro" className="mt-6">
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
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input 
                        id="name" 
                        type="text" 
                        value={user?.user_metadata?.full_name || ''} 
                        disabled 
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        O nome não pode ser alterado
                      </p>
                    </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button type="submit" className="w-full" disabled={isEditingProfile}>
                      {isEditingProfile ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button"
                          variant="destructive" 
                          className="w-full gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Apagar Cadastro
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p className="font-semibold text-destructive">
                              Esta ação é irreversível e permanente!
                            </p>
                            <p>
                              Ao confirmar, os seguintes dados serão apagados para sempre:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Seus dados pessoais (nome, CPF, telefone, email)</li>
                              <li>Histórico de assinaturas e pagamentos</li>
                              <li>Acesso à plataforma</li>
                              <li>Todos os registros associados à sua conta</li>
                            </ul>
                            <p className="font-semibold mt-4">
                              Você realmente deseja continuar?
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteAccount}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Sim, apagar minha conta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

            {/* Aba Meu Plano */}
            {subscription && (
              <TabsContent value="plano" className="mt-6">
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <Button
                      onClick={handleSubscribe}
                      variant="outline"
                      className="w-full"
                    >
                      Renovar Plano
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Cancelamento de Plano",
                          description: "Entre em contato pelo WhatsApp para cancelar seu plano.",
                        });
                        window.open('https://wa.me/551150395554', '_blank');
                      }}
                    >
                      Cancelar Plano
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default MeuCorre;
