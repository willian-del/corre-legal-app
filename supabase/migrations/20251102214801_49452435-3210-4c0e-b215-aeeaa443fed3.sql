-- =====================================================
-- MIGRATION: Sistema de Pagamento Único (6 meses)
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_payment_intent 
  ON public.user_subscriptions(stripe_payment_intent_id) 
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at 
  ON public.user_subscriptions(expires_at) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status 
  ON public.user_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_alerts
  ON public.user_subscriptions(status, expires_at, alert_30_days_sent, alert_15_days_sent, alert_7_days_sent)
  WHERE status = 'active';

-- Atualizar comentário da tabela
COMMENT ON TABLE public.user_subscriptions IS 
  'Gerenciado exclusivamente pelo backend via Stripe webhooks. 
  Modelo: Pagamento único para 6 meses de cobertura.
  Status: active (dentro do período), expired (vencido), canceled (cancelado pelo usuário).';

-- 2. Criar tabela de preços dos planos
CREATE TABLE IF NOT EXISTS public.plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE CHECK (plan_type IN ('bronze', 'prata', 'ouro')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  description text,
  features jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir preços atuais dos planos (valores em centavos)
INSERT INTO public.plan_prices (plan_type, amount_cents, description, features) VALUES
  ('bronze', 6000, '6 meses de cobertura Bronze', '["6 meses de cobertura", "Canal de Atendimento Jurídico Especializado"]'::jsonb),
  ('prata', 12000, '6 meses de cobertura Prata', '["6 meses de cobertura", "Canal de Atendimento Jurídico Especializado", "Suporte no Bloqueio e Reativação de Conta"]'::jsonb),
  ('ouro', 18000, '6 meses de cobertura Ouro', '["6 meses de cobertura", "Canal de Atendimento Jurídico Especializado", "Suporte no Bloqueio e Reativação de Conta", "Gestão de Multas e Problemas com a CNH"]'::jsonb)
ON CONFLICT (plan_type) DO NOTHING;

-- RLS: Permitir que todos leiam os preços dos planos
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plan prices"
  ON public.plan_prices
  FOR SELECT
  USING (active = true);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_plan_prices_updated_at
  BEFORE UPDATE ON public.plan_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Criar função para verificar se usuário tem assinatura ativa
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND expires_at > now()
  )
$$;

COMMENT ON FUNCTION public.has_active_subscription IS 
  'Verifica se um usuário tem uma assinatura ativa e dentro do prazo de validade';

-- 4. Criar função para obter assinatura ativa do usuário
CREATE OR REPLACE FUNCTION public.get_active_subscription(_user_id uuid)
RETURNS TABLE (
  id uuid,
  plan_type text,
  status text,
  expires_at timestamp with time zone,
  days_remaining integer,
  payment_method text,
  amount_paid numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    plan_type,
    status,
    expires_at,
    GREATEST(0, EXTRACT(day FROM expires_at - now())::integer) as days_remaining,
    payment_method,
    amount_paid
  FROM public.user_subscriptions
  WHERE user_id = _user_id
    AND status = 'active'
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_active_subscription IS 
  'Retorna os detalhes da assinatura ativa do usuário, incluindo dias restantes';