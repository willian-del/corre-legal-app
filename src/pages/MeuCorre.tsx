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
import { LogOut, Clock, CreditCard, Calendar, Shield, RefreshCw, User, MessageSquare, UserCircle, Trash2, Loader2, ShieldCheck, Info, Edit } from 'lucide-react';
import Logo from '@/components/Logo';
import { PLAN_DETAILS } from '@/lib/plans-config';
import { getProfile, updateProfile, getMaskedCPF } from '@/lib/profile-utils';
import { useToast } from '@/hooks/use-toast';
import { normalizeServiceType, SERVICE_TYPES } from '@/lib/service-type-utils';
import { useAdmin } from '@/hooks/use-admin';

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
  const { isAdmin } = useAdmin();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Profile editing
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [maskedCpf, setMaskedCpf] = useState('***.***.***-**');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Loading states for async operations
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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
        // Normalizar valores legados para valores padronizados
        setServiceType(normalizeServiceType(profile.service_type));
        
        // Get masked CPF from secure edge function (only if session is valid)
        const maskedCpf = await getMaskedCPF(user.id);
        setMaskedCpf(maskedCpf || 'Não informado');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading profile:', error);
      }
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

  const handleSubscribe = async () => {
    setLoadingPlan('ouro');
    
    toast({
      title: "Redirecionando para pagamento",
      description: "Você será direcionado para o checkout do Mercado Pago.",
    });
    
    // Redirecionar para a página de checkout com o plano
    navigate('/checkout?plan=monthly');
    setLoadingPlan(null);
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

  const getPaymentMethodLabel = (method: string | undefined): string => {
    const methodMap: Record<string, string> = {
      'card': 'Cartão de Crédito',
      'pix': 'PIX',
      'boleto': 'Boleto'
    };
    return methodMap[method || ''] || 'Não informado';
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    
    try {
      // Call edge function to handle all deletions securely
      const { error: deleteError } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (deleteError) throw deleteError;

      // Logout and redirect
      toast({
        title: "Conta deletada",
        description: "Sua conta e todos os dados foram removidos permanentemente.",
      });

      await signOut();
      navigate('/');

    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Erro ao deletar conta:', error);
      }
      toast({
        variant: "destructive",
        title: "Erro ao deletar conta",
        description: error.message || "Não foi possível deletar sua conta. Tente novamente.",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    setIsCancellingSubscription(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Plano Cancelado",
          description: "Seu plano foi cancelado. Você perdeu o acesso às funcionalidades premium.",
        });

        // Atualizar estado local
        setSubscription(null);
        
        // Recarregar dados
        await fetchSubscription();
      } else {
        throw new Error(data?.error || 'Erro ao cancelar plano');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Erro ao cancelar plano:', error);
      }
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar o plano.",
      });
    } finally {
      setIsCancellingSubscription(false);
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
    <div className="min-h-screen bg-secondary/30 animate-fade-in">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size={48} />
              <span className="text-xl font-bold text-foreground">Corre Legal</span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate('/admin')} className="gap-2">
                  <ShieldCheck size={18} />
                  <span className="hidden sm:inline">Área Admin</span>
                </Button>
              )}
              <Button variant="ghost" onClick={handleSignOut} className="gap-2">
                <LogOut size={18} />
                Sair
              </Button>
            </div>
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
              <TabsTrigger value="plano" className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Meu Plano</span>
                <span className="sm:hidden">Plano</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba Meus Chamados */}
            <TabsContent value="chamados" className="mt-6">
              <div className="rounded-2xl p-8 md:p-12 border-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <MessageSquare className="w-16 h-16 text-primary" />
                  
                  {subscription ? (
                    // Usuário COM plano ativo - pode iniciar atendimento
                    <>
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
                    </>
                  ) : (
                    // Usuário SEM plano ativo - bloqueado
                    <>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-muted-foreground">Plano Inativo</h3>
                        <p className="text-muted-foreground max-w-md">
                          Para iniciar um novo atendimento você deverá contratar um plano
                        </p>
                      </div>
                      <Button 
                        size="lg" 
                        onClick={handleSubscribe}
                        disabled={loadingPlan !== null}
                        className="button-glow-pulse"
                      >
                        {loadingPlan ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="button-loading-pulse">Processando...</span>
                          </>
                        ) : (
                          'Contratar Plano'
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Aba Meu Cadastro */}
            <TabsContent value="cadastro" className="mt-6">
              <div className="rounded-2xl p-8 border-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-2xl font-semibold">Meus Dados</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Edite suas informações pessoais
                  </p>
                </div>
                <div className="space-y-6">
                  {/* Seção: Dados Cadastrais (Não Editáveis) */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="w-4 h-4" />
                      <span>Dados cadastrais (não podem ser alterados)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Nome Completo</p>
                        <p className="text-sm font-semibold truncate">{user?.user_metadata?.full_name || 'Não informado'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Email</p>
                        <p className="text-sm font-semibold truncate">{user?.email || 'Não informado'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">CPF</p>
                        <p className="text-sm font-semibold">{maskedCpf || 'Carregando...'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Dados Editáveis */}
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Edit className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold">Dados Editáveis</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {SERVICE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button type="submit" className="w-full" disabled={isEditingProfile}>
                      {isEditingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button"
                          variant="destructive" 
                          className="w-full gap-2"
                          disabled={isDeletingAccount}
                        >
                          {isDeletingAccount ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Apagando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              Apagar Cadastro
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p className="font-bold text-destructive text-base">
                    Esta ação é IRREVERSÍVEL e PERMANENTE!
                  </p>
                  
                  {/* Avisos Financeiros e Contratuais */}
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                    {subscription && (
                      <p className="font-semibold text-destructive flex items-start gap-2">
                        <span>⚠️</span>
                        <span>Seu plano será cancelado IMEDIATAMENTE após a exclusão</span>
                      </p>
                    )}
                    <p className="font-semibold text-destructive flex items-start gap-2">
                      <span>💰</span>
                      <span>NÃO haverá reembolso de valores pagos</span>
                    </p>
                    <p className="font-semibold text-destructive flex items-start gap-2">
                      <span>🚫</span>
                      <span>Esta ação NÃO pode ser desfeita de forma alguma</span>
                    </p>
                  </div>

                  <p className="text-sm">
                    Ao confirmar, os seguintes dados serão apagados para sempre:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Seus dados pessoais (nome, CPF, telefone, email)</li>
                    <li>Histórico de assinaturas e pagamentos</li>
                    <li>Acesso à plataforma</li>
                    <li>Todos os registros associados à sua conta</li>
                  </ul>
                  
                  <p className="font-bold mt-4 text-base">
                    Você tem certeza que deseja prosseguir?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Não, manter minha conta</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90 button-destructive-hover"
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="button-loading-pulse">Deletando...</span>
                    </>
                  ) : (
                    'Sim, apagar permanentemente'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </form>
                </div>
              </div>
            </TabsContent>

            {/* Aba Meu Plano */}
          <TabsContent value="plano" className="mt-6">
            {subscription ? (
              <div className={`rounded-2xl p-8 border-2 ${
                subscription.status === 'cancelled' 
                  ? 'bg-muted border-muted-foreground/20' 
                  : 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20'
              }`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Shield className={`w-8 h-8 ${
                        subscription.status === 'cancelled' ? 'text-muted-foreground' : 'text-primary'
                      }`} />
                      <div>
                        <h2 className={`text-2xl font-bold ${
                          subscription.status === 'cancelled' ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {subscription.status === 'cancelled' ? 'Plano Inativo' : 'Plano Ativo'}
                        </h2>
                        <p className="text-muted-foreground">
                          {subscription.status === 'cancelled' 
                            ? 'Plano cancelado - Sem acesso às funcionalidades' 
                            : 'Você está protegido!'}
                        </p>
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
                <p className="text-lg font-bold text-foreground">
                  {getPaymentMethodLabel(subscription.payment_method)}
                </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: {subscription.status === 'cancelled' ? 'Cancelado' : 'Ativo'}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {subscription.status === 'cancelled' ? (
                      // Plano cancelado - só mostrar botão de contratar
                      <Button
                        onClick={handleSubscribe}
                        className="w-full col-span-2 button-glow-pulse"
                        disabled={loadingPlan !== null}
                      >
                        {loadingPlan ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="button-loading-pulse">Processando...</span>
                          </>
                        ) : (
                          'Contratar Novo Plano'
                        )}
                      </Button>
                    ) : (
                      // Plano ativo - mostrar renovar e cancelar
                      <>
                        <Button
                          onClick={handleSubscribe}
                          variant="outline"
                          className="w-full"
                          disabled={loadingPlan !== null}
                        >
                          {loadingPlan ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              <span className="button-loading-pulse">Processando...</span>
                            </>
                          ) : (
                            'Renovar Plano'
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                              Cancelar Plano
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>⚠️ Cancelar Plano Ativo?</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-3">
                                <p className="font-bold text-destructive text-base">
                                  Atenção! Esta ação terá efeito IMEDIATO!
                                </p>
                                
                                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                                  <p className="font-semibold text-destructive flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>Você perderá o acesso às funcionalidades premium IMEDIATAMENTE</span>
                                  </p>
                                  <p className="font-semibold text-destructive flex items-start gap-2">
                                    <span>💰</span>
                                    <span>NÃO haverá reembolso do valor pago (R$ {subscription.amount_paid.toFixed(2)})</span>
                                  </p>
                                  <p className="font-semibold text-destructive flex items-start gap-2">
                                    <span>🚫</span>
                                    <span>O plano será marcado como INATIVO permanentemente</span>
                                  </p>
                                </div>

                                <p className="text-sm">
                                  Ao cancelar, você não poderá mais:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  <li>Iniciar novos atendimentos jurídicos</li>
                                  <li>Acessar suporte especializado</li>
                                  <li>Utilizar os benefícios do plano {PLAN_DETAILS[subscription.plan_type as keyof typeof PLAN_DETAILS]?.name}</li>
                                </ul>
                                
                                <p className="font-bold mt-4 text-base">
                                  Tem certeza que deseja cancelar seu plano?
                                </p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Não, manter plano ativo</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={handleCancelSubscription}
                                className="bg-destructive hover:bg-destructive/90 button-destructive-hover"
                                disabled={isCancellingSubscription}
                              >
                                {isCancellingSubscription ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    <span className="button-loading-pulse">Cancelando...</span>
                                  </>
                                ) : (
                                  'Sim, cancelar plano'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                  </>
                )}
              </div>
            </div>
            ) : (
              // Usuário SEM plano ativo - bloqueado
              <div className="bg-card rounded-2xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <MessageSquare className="w-16 h-16 text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-muted-foreground">Plano Inativo</h3>
                    <p className="text-muted-foreground max-w-md">
                      Para iniciar um novo atendimento você deverá contratar um plano
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleSubscribe}
                    disabled={loadingPlan !== null}
                    className="button-glow-pulse"
                  >
                    {loadingPlan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="button-loading-pulse">Processando...</span>
                      </>
                    ) : (
                      'Contratar Plano'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default MeuCorre;
