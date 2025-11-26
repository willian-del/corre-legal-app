-- Adicionar coluna para controlar se o usuário já viu a tela de boas-vindas
ALTER TABLE public.profiles 
ADD COLUMN has_seen_welcome boolean DEFAULT false;

-- Marcar usuários existentes como já tendo visto (para não mostrar a tela para eles)
UPDATE public.profiles 
SET has_seen_welcome = true 
WHERE id IS NOT NULL;