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
import { Badge } from '@/components/ui/badge';
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
import { LogOut, Clock, CreditCard, Calendar, Shield, RefreshCw, User, MessageSquare, UserCircle, Trash2, Loader2, ExternalLink } from 'lucide-react';
import Logo from '@/components/Logo';
import { PLAN_DETAILS } from '@/lib/stripe-config';
import { getProfile, updateProfile, getMaskedCPF } from '@/lib/profile-utils';
import { useToast } from '@/hooks/use-toast';
import { normalizeServiceType, SERVICE_TYPES } from '@/lib/service-type-utils';
import ZendeskWidget, { openZendeskWidget } from '@/components/ZendeskWidget';
import { CreateTicketDialog } from '@/components/CreateTicketDialog';

interface UserSubscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string;
  days_remaining: number;
  payment_method: string;
  amount_paid: number;
}

interface Ticket {
  id: string | number;
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
  type: 'zendesk' | 'internal';
  url?: string;
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
  
  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  
  // Loading states for async operations
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchProfile();
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    
    setLoadingTickets(true);
    try {
      // Buscar tickets do Zendesk e internos em paralelo
      const [zendeskResponse, internalResponse] = await Promise.all([
        supabase.functions.invoke('get-zendesk-tickets'),
        supabase.functions.invoke('get-internal-tickets')
      ]);
      
      const zendeskTickets = zendeskResponse.data?.tickets || [];
      const internalTickets = internalResponse.data?.tickets || [];
      
      // Unificar e ordenar por data de criação (mais recente primeiro)
      const allTickets = [...zendeskTickets, ...internalTickets].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTickets(allTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

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
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan_type: 'ouro' }
      });

      if (error) {
        if (error.message?.includes('INVALID_PRICE_ID')) {
          throw new Error('CONFIG_ERROR');
        }
        throw error;
      }

      if (data?.url) {
        const newWindow = window.open(data.url, '_blank');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          toast({
            title: "Pop-up bloqueado",
            description: "Por favor, permita pop-ups para este site e tente novamente.",
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(data.url, '_blank')}
              >
                Tentar novamente
              </Button>
            ),
          });
          return;
        }
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será direcionado para o Stripe para finalizar o pagamento.",
        });
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error creating checkout:", error);
      }
      
      let title = "Erro ao processar pagamento";
      let description = "Não foi possível iniciar o processo de pagamento. Por favor, tente novamente.";
      
      if (error.message === 'CONFIG_ERROR') {
        title = "Erro de configuração";
        description = "Há um problema na configuração dos planos. Por favor, entre em contato com o suporte.";
      } else if (error.message?.includes('Network')) {
        description = "Problema de conexão. Verifique sua internet e tente novamente.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
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
            <TabsContent value="chamados" className="mt-6 space-y-6">
              {/* Ações rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Atendimento
                  </CardTitle>
                  <CardDescription>
                    {subscription 
                      ? "Inicie uma conversa com nossa equipe através do chat" 
                      : "Contrate um plano para ter acesso ao atendimento"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-3">
                  {subscription ? (
                    <>
                      <Button 
                        onClick={() => setShowCreateTicket(true)}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Abrir Novo Chamado
                      </Button>
                      <Button 
                        onClick={() => openZendeskWidget()}
                        className="flex-1 gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat de Atendimento
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open('https://wa.me/551150395554', '_blank')}
                        className="flex-1 gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleSubscribe}
                      disabled={loadingPlan !== null}
                      className="w-full button-glow-pulse"
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
                  )}
                </CardContent>
              </Card>

              {/* Histórico de Tickets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Histórico de Chamados</CardTitle>
                      <CardDescription>
                        Acompanhe todos os seus atendimentos
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={fetchTickets}
                      disabled={loadingTickets}
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingTickets ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTickets ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : tickets.length > 0 ? (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div 
                          key={`${ticket.type}-${ticket.id}`}
                          className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">
                                  {ticket.subject || 'Sem título'}
                                </h4>
                                
                                {/* Badge de origem */}
                                <Badge 
                                  variant="outline" 
                                  className={ticket.type === 'zendesk' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }
                                >
                                  {ticket.type === 'zendesk' ? 'Zendesk' : 'Sistema'}
                                </Badge>
                                
                                {/* Badge de status */}
                                <Badge variant={
                                  ticket.status === 'new' ? 'default' :
                                  ticket.status === 'open' ? 'secondary' :
                                  ticket.status === 'pending' ? 'outline' :
                                  ticket.status === 'solved' || ticket.status === 'resolved' ? 'default' :
                                  'secondary'
                                } className={
                                  ticket.status === 'solved' || ticket.status === 'resolved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : ''
                                }>
                                  {ticket.status === 'new' && 'Novo'}
                                  {ticket.status === 'open' && 'Aberto'}
                                  {ticket.status === 'pending' && 'Pendente'}
                                  {ticket.status === 'in_progress' && 'Em Andamento'}
                                  {(ticket.status === 'solved' || ticket.status === 'resolved') && 'Resolvido'}
                                  {ticket.status === 'closed' && 'Fechado'}
                                  {!['new', 'open', 'pending', 'in_progress', 'solved', 'resolved', 'closed'].includes(ticket.status) && ticket.status}
                                </Badge>
                              </div>
                              
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {ticket.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  Criado em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                </span>
                                <span>•</span>
                                <span>
                                  Atualizado em {new Date(ticket.updated_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            
                            {ticket.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(ticket.url, '_blank')}
                                className="gap-2"
                              >
                                Ver
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum chamado encontrado</p>
                      <p className="text-sm mt-1">
                        {subscription 
                          ? "Inicie uma conversa usando o botão acima" 
                          : "Contrate um plano para começar"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
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
                          {SERVICE_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              </CardContent>
            </Card>
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
                      <p className="text-lg font-bold text-foreground capitalize">
                        {subscription.payment_method === 'credit_card' ? 'Cartão' : subscription.payment_method}
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
      
      {/* Modal de Criação de Ticket */}
      <CreateTicketDialog
        open={showCreateTicket}
        onOpenChange={setShowCreateTicket}
        onTicketCreated={fetchTickets}
      />

      {/* Zendesk Widget - Carregado apenas para usuários autenticados */}
      <ZendeskWidget 
        showOnlyWithSubscription={false}
        hasActiveSubscription={!!subscription}
      />
    </div>
  );
};

export default MeuCorre;
