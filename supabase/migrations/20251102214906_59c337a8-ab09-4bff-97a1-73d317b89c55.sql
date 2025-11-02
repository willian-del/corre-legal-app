-- =====================================================
-- MIGRATION: Sistema de Pagamento Único (6 meses) - PARTE 1
-- =====================================================

-- 1. Atualizar tabela user_subscriptions para suportar pagamentos únicos
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('pix', 'card', 'boleto')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS alert_30_days_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_15_days_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alert_7_days_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BRL';

-- Adicionar constraint única apenas para payment_intent_id quando não for nulo
DROP INDEX IF EXISTS idx_user_subscriptions_payment_intent;
CREATE UNIQUE INDEX idx_user_subscriptions_payment_intent 
  ON public.user_subscriptions(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Adicionar índices para performance
DROP INDEX IF EXISTS idx_user_subscriptions_expires_at;
CREATE INDEX idx_user_subscriptions_expires_at 
  ON public.user_subscriptions(expires_at) 
  WHERE status = 'active';

DROP INDEX IF EXISTS idx_user_subscriptions_user_status;
CREATE INDEX idx_user_subscriptions_user_status 
  ON public.user_subscriptions(user_id, status);

DROP INDEX IF EXISTS idx_user_subscriptions_alerts;
CREATE INDEX idx_user_subscriptions_alerts
  ON public.user_subscriptions(status, expires_at, alert_30_days_sent, alert_15_days_sent, alert_7_days_sent)
  WHERE status = 'active';

-- Atualizar comentário da tabela
COMMENT ON TABLE public.user_subscriptions IS 
  'Gerenciado exclusivamente pelo backend via Stripe webhooks. 
  Modelo: Pagamento único para 6 meses de cobertura.
  Status: active (dentro do período), expired (vencido), canceled (cancelado pelo usuário).';