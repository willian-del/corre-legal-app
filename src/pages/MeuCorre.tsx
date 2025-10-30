import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Package, FileText, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

interface UserSubscription {
  plan_type: string;
  status: string;
  current_period_end: string | null;
}

const MeuCorre = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('plan_type, status, current_period_end')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSubscribe = () => {
    navigate('/#pricing');
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Meu <span className="text-primary">Corre</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Bem-vindo à sua área exclusiva
          </p>

          {/* No Subscription Alert */}
          {!subscription && (
            <Card className="mb-8 border-primary/50">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <CardTitle>Você ainda não possui um plano ativo</CardTitle>
                    <CardDescription className="mt-2">
                      Para ter acesso completo à área do cliente e todos os benefícios do Corre Legal, 
                      você precisa assinar um de nossos planos.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={handleSubscribe} className="gap-2">
                  <Package size={18} />
                  Ver Planos Disponíveis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* User Info Card */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Suas Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                {user?.user_metadata?.full_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{user.user_metadata.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {subscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Seu Plano
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Plano Atual</p>
                    <p className="font-medium capitalize">{subscription.plan_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Ativo
                      </span>
                    </p>
                  </div>
                  {subscription.current_period_end && (
                    <div>
                      <p className="text-sm text-muted-foreground">Renovação</p>
                      <p className="font-medium">
                        {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coming Soon Features */}
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Funcionalidades
                </CardTitle>
                <CardDescription>
                  Recursos disponíveis em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Atendimentos</h4>
                    <p className="text-sm text-muted-foreground">
                      Abrir e acompanhar chamados
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Documentos</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload e gerenciamento de arquivos
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-semibold mb-1">Histórico</h4>
                    <p className="text-sm text-muted-foreground">
                      Ver histórico de atendimentos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default MeuCorre;
