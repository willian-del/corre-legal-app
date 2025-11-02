-- =====================================================
-- MIGRATION: Sistema de Pagamento Único (6 meses) - PARTE 2
-- =====================================================

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

-- RLS: Permitir que todos leiam os preços dos planos
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

-- Remover policy existente se houver e recriar
DROP POLICY IF EXISTS "Anyone can view active plan prices" ON public.plan_prices;

CREATE POLICY "Anyone can view active plan prices"
  ON public.plan_prices
  FOR SELECT
  USING (active = true);

-- Adicionar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_plan_prices_updated_at ON public.plan_prices;

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