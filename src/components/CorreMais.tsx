import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  getLevelName,
  getLevelImage,
  getProgressToNextLevel,
  getReferralsToNextLevel,
  getNextLevelName,
  generateReferralLink,
} from '@/lib/referral-levels';
import { QRCodeDialog } from './QRCodeDialog';
import { LevelUpDialog } from './LevelUpDialog';
import {
  Copy,
  QrCode,
  MessageCircle,
  Users,
  Calendar,
  Trophy,
  Share2,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReferralData {
  referral_code: string | null;
  total_referrals: number;
  earned_days: number;
  current_level: number;
}

interface ReferralHistoryItem {
  id: string;
  referred_name: string | null;
  created_at: string;
  status: string;
}

export const CorreMais = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [levelUpDialogOpen, setLevelUpDialogOpen] = useState(false);
  const [newLevelReached, setNewLevelReached] = useState(1);

  useEffect(() => {
    if (user) {
      fetchReferralData();
      fetchHistory();
    }
  }, [user]);

  const generateUniqueCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const fetchReferralData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals, earned_days, current_level')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      // Se não tem referral_code, gera um novo
      if (!data.referral_code) {
        const newCode = generateUniqueCode();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: newCode })
          .eq('id', user?.id);
        
        if (!updateError) {
          setReferralData({ ...data, referral_code: newCode });
          return;
        }
      }
      
      setReferralData(data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_history')
        .select('id, referred_name, created_at, status')
        .eq('referrer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching referral history:', error);
    }
  };

  const referralLink = referralData?.referral_code
    ? generateReferralLink(referralData.referral_code)
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copiado!",
        description: "Compartilhe com seus amigos",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `Vem pro Corre Legal! Usa meu link e ganha cobertura extra: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Corre Legal - Convite',
          text: 'Vem pro Corre Legal! Usa meu link e ganha cobertura extra:',
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentLevel = referralData?.current_level || 1;
  const totalReferrals = referralData?.total_referrals || 0;
  const earnedDays = referralData?.earned_days || 0;
  const progress = getProgressToNextLevel(totalReferrals);
  const referralsToNext = getReferralsToNextLevel(totalReferrals);
  const nextLevelName = getNextLevelName(currentLevel);

  return (
    <div className="space-y-6 pb-8">
      {/* Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-primary/20 relative aspect-[4/3] sm:aspect-[16/9]">
          {/* Imagem como background */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getLevelImage(currentLevel)})` }}
          />
          
          {/* Overlay gradiente para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Conteúdo sobre a imagem */}
          <CardContent className="relative z-10 h-full flex flex-col justify-end p-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <p className="text-sm text-white/80 mb-1">Seu nível atual:</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {getLevelName(currentLevel)}
              </h2>

              {nextLevelName ? (
                <p className="text-sm text-white/70">
                  Você está a <span className="font-semibold text-white">{referralsToNext}</span> indicações do próximo nível
                </p>
              ) : (
                <p className="text-sm text-yellow-400 font-medium">
                  🎉 Você atingiu o nível máximo!
                </p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Bar */}
      {currentLevel < 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progresso</span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{getLevelName(currentLevel)}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{nextLevelName}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Indicações</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <Calendar className="w-5 h-5 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{earnedDays}</p>
            <p className="text-xs text-muted-foreground">Dias extras</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-4">
            <Trophy className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{currentLevel}</p>
            <p className="text-xs text-muted-foreground">Nível</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Share Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Compartilhe seu link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-xs sm:text-sm break-all">
                {loading ? (
                  <Skeleton className="h-4 w-full" />
                ) : referralLink ? (
                  referralLink
                ) : (
                  'Gerando link...'
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={handleCopyLink}
              >
                <Copy className="w-5 h-5" />
                <span className="text-xs">Copiar</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs">QR Code</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">WhatsApp</span>
              </Button>
            </div>

            {navigator.share && (
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={handleNativeShare}
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* History Section */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Histórico de Indicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {item.referred_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      +5 dias
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2 text-sm">Como funciona?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Cada indicação confirmada = <span className="text-foreground font-medium">+5 dias</span> de cobertura extra</li>
              <li>• Suba de nível indicando mais amigos</li>
              <li>• Nível 5 = <span className="text-foreground font-medium">GS do Patrão</span> (50+ indicações)</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* QR Code Dialog */}
      <QRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        referralLink={referralLink}
        referralCode={referralData?.referral_code || ''}
      />

      {/* Level Up Dialog */}
      <LevelUpDialog
        open={levelUpDialogOpen}
        onOpenChange={setLevelUpDialogOpen}
        newLevel={newLevelReached}
      />
    </div>
  );
};
