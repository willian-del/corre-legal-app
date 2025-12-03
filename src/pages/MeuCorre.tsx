import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LogOut, Clock, CreditCard, Calendar, Shield, RefreshCw, User, MessageSquare, UserCircle, Trash2, Loader2, ShieldCheck, Info, Edit, Trophy, ArrowLeft, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { PLAN_DETAILS } from '@/lib/plans-config';
import { getProfile, updateProfile, getMaskedCPF } from '@/lib/profile-utils';
import { useToast } from '@/hooks/use-toast';
import { normalizeServiceType, SERVICE_TYPES } from '@/lib/service-type-utils';
import { useAdmin } from '@/hooks/use-admin';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CorreMais } from '@/components/CorreMais';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveSection = 'dashboard' | 'atendimento' | 'corre-mais' | 'meu-plano' | 'meu-cadastro';

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
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [referralLevel, setReferralLevel] = useState<number>(1);
  
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
      fetchReferralLevel();
    } else {
      // Reset states when user logs out
      setSubscription(null);
      setPhone('');
      setServiceType('');
      setMaskedCpf('***.***.***-**');
      setLoading(false);
    }
  }, [user]);

  const fetchReferralLevel = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('current_level')
      .eq('id', user.id)
      .single();
    if (data?.current_level) {
      setReferralLevel(data.current_level);
    }
  };

  const fetchProfile = async () => {
    if (!user) {
      if (import.meta.env.DEV) {
        console.log('Cannot fetch profile: no user');
      }
      return;
    }

    try {
      // Verify session is still valid before fetching
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[PROFILE] Session expired, logging out');
        await signOut();
        navigate('/auth');
        return;
      }

      const profile = await getProfile(user.id);
      if (profile) {
        setPhone(formatPhone(profile.phone || ''));
        setServiceType(normalizeServiceType(profile.service_type));
        
        // Get masked CPF from secure edge function (only if session is valid)
        const maskedCpf = await getMaskedCPF(user.id);
        setMaskedCpf(maskedCpf || 'Não informado');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error loading profile:', error);
      }
      
      // If 401 error, session expired - logout
      if (error?.message?.includes('401') || error?.message?.includes('autorizado')) {
        console.log('[PROFILE] Auth error, logging out');
        await signOut();
        navigate('/auth');
      }
    }
  };

  const fetchSubscription = async () => {
    if (!user) {
      if (import.meta.env.DEV) {
        console.log('Cannot fetch subscription: no user');
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('get_active_subscription', {
      _user_id: user.id
    });

    if (error) {
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
    setLoadingPlan('quarterly');
    
    toast({
      title: "Redirecionando para pagamento",
      description: "Você será direcionado para o checkout do Mercado Pago.",
    });
    
    navigate('/checkout?plan=quarterly');
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
      'boleto': 'Boleto',
      'mercadopago': 'Mercado Pago',
      'cortesia': 'Cortesia'
    };
    return methodMap[method || ''] || 'Não informado';
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    
    try {
      const { error: deleteError } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (deleteError) throw deleteError;

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

        setSubscription(null);
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

  const getSectionTitle = (section: ActiveSection): string => {
    const titles: Record<ActiveSection, string> = {
      'dashboard': 'Dashboard',
      'atendimento': 'Atendimento',
      'corre-mais': 'Corre+',
      'meu-plano': 'Meu Plano',
      'meu-cadastro': 'Meu Cadastro'
    };
    return titles[section];
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
          
          <Breadcrumb className="mt-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {activeSection === 'dashboard' ? (
                  <BreadcrumbPage>Meu Corre</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    className="cursor-pointer" 
                    onClick={() => setActiveSection('dashboard')}
                  >
                    Meu Corre
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {activeSection !== 'dashboard' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getSectionTitle(activeSection)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          {activeSection !== 'dashboard' && (
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('dashboard')}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}

          {/* Title */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              {activeSection === 'dashboard' ? (
                <>Meu <span className="text-primary">Corre</span></>
              ) : (
                getSectionTitle(activeSection)
              )}
            </h1>
            <p className="text-muted-foreground">
              {activeSection === 'dashboard' 
                ? `Bem-vindo, ${user?.user_metadata?.full_name || user?.email}`
                : activeSection === 'atendimento' ? 'Inicie um atendimento jurídico'
                : activeSection === 'corre-mais' ? 'Indique amigos e ganhe benefícios'
                : activeSection === 'meu-plano' ? 'Gerencie sua assinatura'
                : 'Gerencie suas informações pessoais'
              }
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Dashboard - Grid 2x2 */}
              {activeSection === 'dashboard' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Card Atendimento */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-border/50"
                    onClick={() => setActiveSection('atendimento')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
                      </div>
                      <span className="font-semibold text-center text-sm sm:text-base">Atendimento</span>
                      {subscription && subscription.status !== 'cancelled' ? (
                        <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Ativo</span>
                      ) : (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Inativo</span>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card Corre+ */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-border/50"
                    onClick={() => setActiveSection('corre-mais')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-600" />
                      </div>
                      <span className="font-semibold text-center text-sm sm:text-base">Corre+</span>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Nível {referralLevel}
                      </span>
                    </CardContent>
                  </Card>

                  {/* Card Meu Plano */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-border/50"
                    onClick={() => setActiveSection('meu-plano')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                      </div>
                      <span className="font-semibold text-center text-sm sm:text-base">Meu Plano</span>
                      {subscription && subscription.status !== 'cancelled' ? (
                        <span className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                          {subscription.days_remaining} dias
                        </span>
                      ) : (
                        <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">Contratar</span>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card Meu Cadastro */}
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-border/50"
                    onClick={() => setActiveSection('meu-cadastro')}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <UserCircle className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
                      </div>
                      <span className="font-semibold text-center text-sm sm:text-base">Meu Cadastro</span>
                      <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Completo
                      </span>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Seção Atendimento */}
              {activeSection === 'atendimento' && (
                <div className="rounded-2xl p-8 md:p-12 border-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                  <div className="flex flex-col items-center justify-center space-y-6">
                    <MessageSquare className="w-16 h-16 text-primary" />
                    
                    {subscription && subscription.status !== 'cancelled' ? (
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
                            'Contrate Agora'
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Seção Corre+ */}
              {activeSection === 'corre-mais' && (
                <CorreMais />
              )}

              {/* Seção Meu Plano */}
              {activeSection === 'meu-plano' && (
                <>
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
                    <div className="rounded-2xl p-8 md:p-12 border-2 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                      <div className="flex flex-col items-center justify-center space-y-6">
                        <Shield className="w-16 h-16 text-primary" />
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
                            'Contrate Agora'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Seção Meu Cadastro */}
              {activeSection === 'meu-cadastro' && (
                <div className="space-y-6">
                  {/* Seção: Dados Cadastrais (Não Editáveis) */}
                  <Card className="border-border/40 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Dados Cadastrais
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Estas informações não podem ser alteradas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                          <p className="text-sm font-medium mt-1 truncate">
                            {user?.user_metadata?.full_name || 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium mt-1 truncate">
                            {user?.email || 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">CPF</Label>
                          <p className="text-sm font-medium mt-1">
                            {maskedCpf || 'Carregando...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seção: Dados Editáveis */}
                  <Card className="border-border/40 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                        Informações Editáveis
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Atualize seu telefone e tipo de serviço
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpdateProfile} className="space-y-5">
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

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <Button 
                            type="submit" 
                            className="flex-1 bg-primary hover:bg-primary/90" 
                            disabled={isEditingProfile}
                          >
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
                                variant="outline" 
                                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isDeletingAccount}
                              >
                                {isDeletingAccount ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Apagando...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
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
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default MeuCorre;
