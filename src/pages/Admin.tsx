import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  CreditCard, 
  Package, 
  FileText, 
  ArrowLeft,
  Shield,
  ShieldCheck,
  Calendar,
  DollarSign,
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service_type: string;
  roles: string[];
  is_admin: boolean;
  subscription: {
    id: string;
    plan_type: string;
    status: string;
    expires_at: string;
    amount_paid: number;
  } | null;
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  bronzeCount: number;
  prataCount: number;
  ouroCount: number;
  expiringCount: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    bronzeCount: 0,
    prataCount: 0,
    ouroCount: 0,
    expiringCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-sub' | 'no-sub' | 'admins'>('all');

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [manualSubPlan, setManualSubPlan] = useState('bronze');
  const [manualSubUser, setManualSubUser] = useState('');

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    loadData();
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [analyticsPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        search: search || ''
      });

      if (filterType === 'with-sub') params.append('hasSubscription', 'true');
      if (filterType === 'no-sub') params.append('hasSubscription', 'false');
      if (filterType === 'admins') params.append('isAdmin', 'true');

      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        body: Object.fromEntries(params)
      });

      if (error) throw error;

      setUsers(data.users || []);

      // Calculate stats
      const totalUsers = data.users?.length || 0;
      const activeSubscriptions = data.users?.filter((u: User) => u.subscription?.status === 'active').length || 0;
      const bronzeCount = data.users?.filter((u: User) => u.subscription?.plan_type === 'bronze' && u.subscription?.status === 'active').length || 0;
      const prataCount = data.users?.filter((u: User) => u.subscription?.plan_type === 'prata' && u.subscription?.status === 'active').length || 0;
      const ouroCount = data.users?.filter((u: User) => u.subscription?.plan_type === 'ouro' && u.subscription?.status === 'active').length || 0;
      
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringCount = data.users?.filter((u: User) => {
        if (!u.subscription?.expires_at || u.subscription?.status !== 'active') return false;
        const expiresAt = new Date(u.subscription.expires_at);
        return expiresAt > now && expiresAt <= sevenDaysFromNow;
      }).length || 0;

      setStats({
        totalUsers,
        activeSubscriptions,
        bronzeCount,
        prataCount,
        ouroCount,
        expiringCount
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: { userId, addRole: 'admin' }
      });

      if (error) throw error;

      toast.success('Usuário promovido a administrador');
      loadData();
    } catch (error) {
      console.error('Error making admin:', error);
      toast.error('Erro ao promover usuário');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: { userId, removeRole: 'admin' }
      });

      if (error) throw error;

      toast.success('Privilégios de administrador removidos');
      loadData();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Erro ao remover privilégios');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n` +
      `Você está prestes a deletar permanentemente o usuário:\n` +
      `${userName}\n\n` +
      `Isso irá remover:\n` +
      `• Perfil e dados pessoais\n` +
      `• Assinaturas\n` +
      `• Roles e permissões\n` +
      `• Logs de auditoria\n\n` +
      `Deseja continuar?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast.success(`Usuário ${userName} deletado com sucesso`);
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao deletar usuário');
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedUser?.subscription) return;

    try {
      const { error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: {
          operation: 'extend',
          subscriptionId: selectedUser.subscription.id,
          daysToExtend: parseInt(extendDays)
        }
      });

      if (error) throw error;

      toast.success(`Assinatura estendida por ${extendDays} dias`);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Erro ao estender assinatura');
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    try {
      const { error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: {
          operation: 'cancel',
          subscriptionId
        }
      });

      if (error) throw error;

      toast.success('Assinatura cancelada');
      loadData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const handleCreateManualSubscription = async () => {
    if (!manualSubUser) return;

    try {
      const { error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: {
          operation: 'create-manual',
          userId: manualSubUser,
          planType: manualSubPlan,
          amountPaid: 0
        }
      });

      if (error) throw error;

      toast.success('Assinatura cortesia criada');
      setManualSubUser('');
      loadData();
    } catch (error) {
      console.error('Error creating manual subscription:', error);
      toast.error('Erro ao criar assinatura');
    }
  };

  const normalizeAnalytics = (rows: any[]) => {
    if (!rows || rows.length === 0) return [];
    
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    
    let cumReg = 0, cumSub = 0, cumRev = 0;
    
    return sorted.map(entry => {
      const reg = Number(entry.registrations) || 0;
      const sub = Number(entry.subscriptions) || 0;
      const rev = Number(entry.revenue) || 0;
      
      cumReg += reg;
      cumSub += sub;
      cumRev += rev;
      
      return {
        date: entry.date,
        registrations: reg,
        subscriptions: sub,
        revenue: rev,
        cumulativeRegistrations: Number(entry.cumulativeRegistrations) || cumReg,
        cumulativeSubscriptions: Number(entry.cumulativeSubscriptions) || cumSub,
        cumulativeRevenue: Number(entry.cumulativeRevenue) || cumRev,
        dau: Number(entry.dau) || 0,
        mau: Number(entry.mau) || 0,
        stickiness: Number(entry.stickiness) || 0
      };
    });
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: { period: analyticsPeriod }
      });
      
      if (error) throw error;
      const normalized = normalizeAnalytics(data.analytics || []);
      setAnalyticsData(normalized);
      console.log('[ADMIN] Analytics loaded:', normalized.length, 'points', normalized[0]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Erro ao carregar analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/meu-corre')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Área Administrativa
              </h1>
              <p className="text-sm text-muted-foreground">Gestão completa da plataforma</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                  <p className="text-xs text-muted-foreground">
                    Bronze: {stats.bronzeCount} | Prata: {stats.prataCount} | Ouro: {stats.ouroCount}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Expirando em 7 dias</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.expiringCount}</div>
                  <p className="text-xs text-muted-foreground">Assinaturas próximas do vencimento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">DAU (Hoje)</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].dau : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Usuários ativos hoje</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">MAU (30 dias)</CardTitle>
                  <Users className="h-4 w-4 text-chart-2" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-chart-2">
                    {analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].mau : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Usuários ativos (30d)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Stickiness</CardTitle>
                  <DollarSign className="h-4 w-4 text-chart-3" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-chart-3">
                    {analyticsData.length > 0 ? analyticsData[analyticsData.length - 1].stickiness : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">DAU/MAU (engajamento)</p>
                </CardContent>
              </Card>
            </div>

            {/* Period Selector */}
            <div className="flex justify-end">
              <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="1y">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Analytics Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Chart 1: Cumulative Registrations vs Subscriptions */}
              <Card>
                <CardHeader>
                  <CardTitle>Cadastros x Assinaturas</CardTitle>
                  <CardDescription>
                    Total acumulado ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="h-[350px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
              <ChartContainer
                config={{
                  cumulativeRegistrations: {
                    label: "Total de Cadastros",
                    color: "hsl(var(--chart-1))"
                  },
                  cumulativeSubscriptions: {
                    label: "Total de Assinaturas",
                    color: "hsl(var(--chart-2))"
                  }
                }}
                className="aspect-auto h-[350px]"
              >
                {analyticsData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                ) : (
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis domain={[0, 'auto']} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeRegistrations" 
                      stroke="var(--color-cumulativeRegistrations)" 
                      name="Total de Cadastros"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeSubscriptions" 
                      stroke="var(--color-cumulativeSubscriptions)" 
                      name="Total de Assinaturas"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                )}
              </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Chart 2: Cumulative Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução da Receita</CardTitle>
                  <CardDescription>
                    Receita total acumulada ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="h-[350px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
              <ChartContainer
                config={{
                  cumulativeRevenue: {
                    label: "Receita Acumulada",
                    color: "hsl(var(--chart-3))"
                  }
                }}
                className="aspect-auto h-[350px]"
              >
                {analyticsData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sem dados para o período selecionado
                  </div>
                ) : (
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis domain={[0, 'auto']} allowDecimals={false} />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                      />} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeRevenue" 
                      stroke="var(--color-cumulativeRevenue)" 
                      name="Receita Acumulada"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                )}
              </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* New Analytics Charts - DAU/MAU/Stickiness */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Chart 3: DAU over time */}
              <Card>
                <CardHeader>
                  <CardTitle>DAU - Usuários Ativos Diários</CardTitle>
                  <CardDescription>
                    Usuários que fizeram login por dia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        dau: {
                          label: "DAU",
                          color: "hsl(var(--chart-1))"
                        }
                      }}
                      className="aspect-auto h-[300px]"
                    >
                      {analyticsData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Sem dados para o período selecionado
                        </div>
                      ) : (
                        <AreaChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis domain={[0, 'auto']} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="dau" 
                            stroke="var(--color-dau)" 
                            fill="var(--color-dau)"
                            fillOpacity={0.2}
                            name="Usuários Ativos Diários"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      )}
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Chart 4: MAU over time */}
              <Card>
                <CardHeader>
                  <CardTitle>MAU - Usuários Ativos Mensais</CardTitle>
                  <CardDescription>
                    Usuários ativos nos últimos 30 dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        mau: {
                          label: "MAU",
                          color: "hsl(var(--chart-2))"
                        }
                      }}
                      className="aspect-auto h-[300px]"
                    >
                      {analyticsData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Sem dados para o período selecionado
                        </div>
                      ) : (
                        <AreaChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis domain={[0, 'auto']} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="mau" 
                            stroke="var(--color-mau)" 
                            fill="var(--color-mau)"
                            fillOpacity={0.2}
                            name="Usuários Ativos Mensais"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      )}
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Chart 5: Stickiness over time */}
              <Card>
                <CardHeader>
                  <CardTitle>Stickiness - Aderência</CardTitle>
                  <CardDescription>
                    Razão DAU/MAU (% de engajamento)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ChartContainer
                      config={{
                        stickiness: {
                          label: "Stickiness",
                          color: "hsl(var(--chart-3))"
                        }
                      }}
                      className="aspect-auto h-[300px]"
                    >
                      {analyticsData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Sem dados para o período selecionado
                        </div>
                      ) : (
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tickFormatter={(value) => `${value}%`}
                          />
                          <ChartTooltip 
                            content={<ChartTooltipContent 
                              formatter={(value) => `${Number(value).toFixed(1)}%`}
                            />} 
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="stickiness" 
                            stroke="var(--color-stickiness)" 
                            name="Stickiness (%)"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </LineChart>
                      )}
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Usuários</CardTitle>
                    <CardDescription>Gerencie todos os usuários da plataforma</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with-sub">Com Assinatura</SelectItem>
                        <SelectItem value="no-sub">Sem Assinatura</SelectItem>
                        <SelectItem value="admins">Administradores</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Buscar por nome..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-[250px]"
                    />
                    <Button onClick={loadData} size="sm">Buscar</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Assinatura</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.phone || '-'}</TableCell>
                        <TableCell>{u.service_type || '-'}</TableCell>
                        <TableCell>
                          {u.subscription ? (
                            <Badge variant={u.subscription.status === 'active' ? 'default' : 'secondary'}>
                              {u.subscription.plan_type} ({u.subscription.status})
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem assinatura</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.is_admin ? (
                            <Badge variant="default" className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline">Usuário</Badge>
                          )}
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {u.id !== user?.id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => u.is_admin ? handleRemoveAdmin(u.id) : handleMakeAdmin(u.id)}
                              >
                                {u.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.full_name)}
                                title="Deletar usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assinaturas</CardTitle>
                    <CardDescription>Gerencie todas as assinaturas</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Cortesia
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Assinatura Cortesia</DialogTitle>
                        <DialogDescription>
                          Crie uma assinatura manual gratuita para um usuário
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Usuário</Label>
                          <Select value={manualSubUser} onValueChange={setManualSubUser}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.filter(u => !u.subscription).map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name} ({u.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Plano</Label>
                          <Select value={manualSubPlan} onValueChange={setManualSubPlan}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bronze">Bronze</SelectItem>
                              <SelectItem value="prata">Prata</SelectItem>
                              <SelectItem value="ouro">Ouro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateManualSubscription}>Criar Assinatura</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.subscription).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{u.full_name}</div>
                            <div className="text-sm text-muted-foreground">{u.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{u.subscription!.plan_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.subscription!.status === 'active' ? 'default' : 'secondary'}>
                            {u.subscription!.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(u.subscription!.expires_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          R$ {(u.subscription!.amount_paid / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setExtendDays('30');
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Estender
                          </Button>
                          {u.subscription!.status === 'active' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSubscription(u.subscription!.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Planos e Preços</CardTitle>
                <CardDescription>Configure os planos de assinatura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bronze</CardTitle>
                      <CardDescription>Plano básico</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">R$ 60,00</div>
                      <p className="text-sm text-muted-foreground mt-2">Mensal</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Prata</CardTitle>
                      <CardDescription>Plano intermediário</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">R$ 120,00</div>
                      <p className="text-sm text-muted-foreground mt-2">Mensal</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Ouro</CardTitle>
                      <CardDescription>Plano premium</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">R$ 180,00</div>
                      <p className="text-sm text-muted-foreground mt-2">Mensal</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Extend Subscription Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estender Assinatura</DialogTitle>
            <DialogDescription>
              Estenda o período de assinatura de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dias para adicionar</Label>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                min="1"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Expira atualmente em: {selectedUser?.subscription && new Date(selectedUser.subscription.expires_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancelar</Button>
            <Button onClick={handleExtendSubscription}>Estender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
