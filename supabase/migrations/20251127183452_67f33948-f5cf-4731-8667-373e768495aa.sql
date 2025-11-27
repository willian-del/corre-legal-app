-- Remover o check constraint antigo
ALTER TABLE public.plan_prices
DROP CONSTRAINT IF EXISTS plan_prices_plan_type_check;

-- Desativar todos os planos antigos
UPDATE public.plan_prices SET active = false;

-- Deletar o plano quarterly se já existir
DELETE FROM public.plan_prices WHERE plan_type = 'quarterly';

-- Adicionar novo check constraint mais flexível (permite quarterly e futuros planos)
ALTER TABLE public.plan_prices
ADD CONSTRAINT plan_prices_plan_type_check 
CHECK (plan_type IN ('bronze', 'prata', 'ouro', 'monthly', 'quarterly', 'annual'));